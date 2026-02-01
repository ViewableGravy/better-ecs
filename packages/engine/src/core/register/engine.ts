import type { EngineInitializationSystem, EngineSystem, SystemFactoryTuple } from "./system";
import { UserWorld } from "../../ecs/world";
import { executeWithContext } from "../context";
import type { EngineFrame, EngineUpdate, FrameStats } from "../types";
import type { EngineSystemTypes } from "../../systems/engine-system-types";
import { inputSystem } from "../../systems/input";
import { transformSnapshotSystem } from "../../systems/transformSnapshot";
import type { SceneDefinitionTuple, SceneName } from "../scene/scene.types";
import { SceneManager } from "../scene/scene-manager";

type StartEngineOpts = {
  fps?: number;
  ups?: number;
  signal?: AbortSignal;
}

type StartEngineGenerator = AsyncGenerator<readonly [EngineUpdate, EngineFrame], void, unknown>;

type SystemName<TFactory> = TFactory extends { 
  ["~types"]: { name: infer N extends string } 
} ? N : never;

type SystemsTupleToRecord<T extends SystemFactoryTuple> = {
  [Factory in T[number] as SystemName<Factory>]: ReturnType<Factory>
}

/** Combines user-defined systems with built-in engine systems */
type AllSystems<T extends SystemFactoryTuple> = SystemsTupleToRecord<T> & EngineSystemTypes;

/** Converts scene tuple to a record of scene names to scene definitions */
type ScenesTupleToRecord<T extends SceneDefinitionTuple> = {
  [Scene in T[number] as SceneName<Scene>]: Scene
}

export class EngineClass<
  TSystems extends SystemFactoryTuple,
  TScenes extends SceneDefinitionTuple = []
> {
  #systems: Record<string, EngineSystem<any>>;

  // Cached sorted lists for each phase
  #updateSystems: EngineSystem<any>[] = [];
  #renderSystems: EngineSystem<any>[] = [];

  #currentPhase: "update" | "render" | null = null;
  #phaseFn = (phase: "update" | "render") => phase === this.#currentPhase;

  private initializationSystem: EngineInitializationSystem | null = null;
  private initialized: boolean = false;

  /**
   * Scene manager for handling scene lifecycle and transitions.
   * Use `engine.scene.set("name")` to transition between scenes.
   */
  public readonly scene: SceneManager<TScenes>;

  public frame: FrameStats = {
    updateDelta: 0,
    frameDelta: 0,
    phase: (_) => false,
    fps: 60,
    ups: 60,
    initialFPS: 60,
    initialUPS: 60,
    updateProgress: 0,
    lastUpdateTime: 0,
  };

  public constructor(
    systems: Record<string, EngineSystem<any>>,
    scenes: SceneDefinitionTuple = []
  ) {
    this.#systems = systems;
    this.scene = new SceneManager<TScenes>(scenes);
    this.scene.setEngineRef(this);

    this.frame.phase = this.#phaseFn;
    
    this.precomputeSystemOrder();
  }

  private precomputeSystemOrder() {
    const allSystems = Object.values(this.#systems);

    const getPriority = (system: EngineSystem<any>, phase: "update" | "render"): number => {
        if (typeof system.priority === "number") {
          return system.priority;
        }
        return system.priority[phase] ?? 0;
    };

    this.#updateSystems = allSystems
      .filter((s) => ['update', 'all'].includes(s.phase))
      .sort((a, b) => getPriority(b, "update") - getPriority(a, "update"));

    this.#renderSystems = allSystems
      .filter((s) => ['render', 'all'].includes(s.phase))
      .sort((a, b) => getPriority(b, "render") - getPriority(a, "render"));
  }

  /** Prefer `useSystem()` in systems instead. */
  public get systems(): AllSystems<TSystems> {
    return this.#systems as any;
  }

  /** Get registered scenes */
  public get scenes(): ScenesTupleToRecord<TScenes> {
    return this.scene.all as any;
  }

  /** Prefer `useWorld()` in systems instead. Returns the active scene's world. */
  public get world(): UserWorld {
    return this.scene.world;
  }

  public async initialize(): Promise<void> {
    if (this.initialized) return;

    await executeWithContext({ engine: this } as any, async () => {
      // Run initialization system if provided
      if (this.initializationSystem) {
        await this.initializationSystem.system();
      }

      // Initialize all systems
      for (const system of Object.values(this.#systems)) {
        if (system.initialize) {
          system.initialize();
        }
      }
    });

    this.initialized = true;
  }

  public async *startEngine(opts?: StartEngineOpts): StartEngineGenerator {
    // Run initialization system and system initializations if not already initialized
    await this.initialize();

    // Store fps and ups on the engine for access in systems
    this.frame.fps = opts?.fps || 60;
    this.frame.ups = opts?.ups || 60;
    this.frame.initialFPS = opts?.fps || 60;
    this.frame.initialUPS = opts?.ups || 60;

    let lastUpdateTime = performance.now();
    let lastFrameTime = performance.now();

    const updateState: EngineUpdate = {
      delta: 0,
      shouldUpdate: false,
    };

    const frameState: EngineFrame = {
      delta: 0,
      shouldUpdate: false,
    };

    const yieldState = [updateState, frameState] as const;

    const requestAnimationFrame = (cb: (time: number) => void) => {
      if (typeof window !== 'undefined' && window.requestAnimationFrame) {
        return window.requestAnimationFrame(cb);
      }
      return setTimeout(() => cb(performance.now()), 1000 / this.frame.fps);
    };

    while (!opts?.signal?.aborted) {
      const frameTime = 1000 / this.frame.fps;
      const updateTime = 1000 / this.frame.ups;

      const now = await new Promise<number>(requestAnimationFrame);

      const updateDelta = now - lastUpdateTime;
      const frameDelta = now - lastFrameTime;

      // Allow 15% tolerance for frame timing to catch frames slightly faster than target
      // This is common when VSync is active and the calculated sleep matches the refresh rate
      const frameTolerance = frameTime * 0.15;
      
      const updateShouldRun = updateDelta >= updateTime;
      const frameShouldRun = frameDelta >= (frameTime - frameTolerance);

      if (updateShouldRun || frameShouldRun) {
        (updateState as any).delta = updateDelta;
        (updateState as any).shouldUpdate = updateShouldRun;
        (frameState as any).delta = frameDelta;
        (frameState as any).shouldUpdate = frameShouldRun;

        // Update engine instance properties
        this.frame.updateDelta = updateDelta;
        this.frame.frameDelta = frameDelta;
        // Calculate how far we are into the current update interval (0.0 to 1.0)
        this.frame.updateProgress = Math.min(updateDelta / updateTime, 1.0);

        // Skip system execution during scene transitions
        if (!this.scene.isTransitioning) {
          // Run systems based on phase - render ALWAYS runs before update
          if (frameState.shouldUpdate) {
            this.runSystems("render", frameState.shouldUpdate);
          }
          if (updateState.shouldUpdate) {
            this.runSystems("update", updateState.shouldUpdate);
            // Update lastUpdateTime immediately to prevent double-running updates
            lastUpdateTime = now;
            this.frame.lastUpdateTime = now;
            // Only allow one update per frame to ensure proper interpolation
            (updateState as any).shouldUpdate = false;
          }
        }

        yield yieldState;

        if (frameShouldRun) {
          lastFrameTime = now;
        }
      }
    }
  }

  private runSystems(phase: "update" | "render", shouldUpdate: boolean) {
    if (!shouldUpdate) return;

    this.#currentPhase = phase;
    const systemsToRun = phase === "update"
      ? this.#updateSystems 
      : this.#renderSystems;

    executeWithContext({ engine: this } as any, () => {
      for (const system of systemsToRun) {
        if (!system.enabled) continue;
        system.system();
      }
    });

    this.#currentPhase = null;
  }
}

/** Options for createEngine */
type CreateEngineOptions<
  TSystems extends SystemFactoryTuple,
  TScenes extends SceneDefinitionTuple
> = {
  systems: TSystems;
  scenes?: TScenes;
  initialScene?: SceneName<TScenes[number]>;
  initialization?: EngineInitializationSystem;
}

export function createEngine<
  const TSystems extends SystemFactoryTuple,
  const TScenes extends SceneDefinitionTuple = []
>(opts: CreateEngineOptions<TSystems, TScenes>): EngineClass<TSystems, TScenes> {
  // Create the engine instance
  const systemsRecord: Record<string, EngineSystem<any>> = {};

  // Add built-in systems
  const builtInSystems = [inputSystem, transformSnapshotSystem];
  for (const factory of builtInSystems) {
    const system = factory();
    systemsRecord[system.name] = system;
  }

  // Initialize each system by calling its factory (no engine parameter needed)
  for (const factory of opts.systems) {
    const system = factory();
    systemsRecord[system.name] = system;
  }

  // Create and return engine instance with scenes
  const scenes = opts.scenes ?? [] as unknown as TScenes;
  const engine = new EngineClass<TSystems, TScenes>(systemsRecord, scenes);
  
  // Set initialization system if provided
  if (opts.initialization) {
    (engine as any).initializationSystem = opts.initialization;
  }

  // Set initial scene if provided (will be activated during initialize())
  if (opts.scenes?.length) {
    const firstScene = opts.scenes[0].name as unknown as SceneName<TScenes[number]> | undefined;
    const initialScene = opts.initialScene ?? firstScene;

    if (initialScene) {
      // We need to set the initial scene after the engine is created
      // This is done asynchronously during engine.initialize() 
      const originalInitialize = engine.initialize.bind(engine);
      (engine as any).initialize = async function() {
        await originalInitialize();
        await engine.scene.set(initialScene);
      };
    }
  }
  
  // Return engine with type info for module augmentation
  return engine;
}
