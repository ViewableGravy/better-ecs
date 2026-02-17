import { AssetManager } from "../../asset/AssetManager";
import type { UserWorld } from "../../ecs/world";
import type { EngineSystemTypes } from "../../systems/engine-system-types";
import { executeWithContext } from "../context";
import type { RenderPipeline } from "../render-pipeline";
import { SceneManager } from "../scene/scene-manager";
import type { SceneDefinition, SceneDefinitionTuple, SceneName } from "../scene/scene.types";
import type { EngineFrame, EngineUpdate, FrameStats } from "../types";
import type { EngineInitializationSystem, EngineSystem, SystemFactoryTuple } from "./system";
import { executeSystemInitialize } from "./system";

/***** TYPE DEFINITIONS *****/
type StartEngineOpts = {
  fps?: number;
  ups?: number;
  signal?: AbortSignal;
};

type StartEngineGenerator = AsyncGenerator<readonly [EngineUpdate, EngineFrame], void, unknown>;

type SystemName<TFactory> = TFactory extends {
  ["~types"]: { name: infer N extends string };
}
  ? N
  : never;

type SystemsTupleToRecord<T extends SystemFactoryTuple> = {
  [Factory in T[number] as SystemName<Factory>]: ReturnType<Factory>;
};

type FactoriesToRecord<TFactories> = {
  [Factory in Extract<
    TFactories,
    (...args: unknown[]) => unknown
  > as SystemName<Factory>]: ReturnType<Factory>;
};

type SceneSystemFactories<T extends SceneDefinitionTuple> =
  T[number] extends SceneDefinition<string, infer TSceneSystems extends SystemFactoryTuple>
    ? TSceneSystems[number]
    : never;

/** Combines engine/global systems, active-scene systems, and built-in engine systems */
type AllSystems<
  TSystems extends SystemFactoryTuple,
  TScenes extends SceneDefinitionTuple,
> = 
  & SystemsTupleToRecord<TSystems> 
  & FactoriesToRecord<SceneSystemFactories<TScenes>> 
  & EngineSystemTypes;

/** Converts scene tuple to a record of scene names to scene definitions */
type ScenesTupleToRecord<T extends SceneDefinitionTuple> = {
  [Scene in T[number] as SceneName<Scene>]: Scene;
};

class CanvasManager {
  #canvas: HTMLCanvasElement | null;
  #isCanvasReady: boolean;
  #awaitCanvasBeforeStart: boolean;
  #canvasReadyPromise: Promise<void>;
  #resolveCanvasReady: (() => void) | null = null;

  public constructor(canvas: HTMLCanvasElement | null, awaitCanvasBeforeStart: boolean) {
    this.#canvas = canvas;
    this.#isCanvasReady = canvas !== null;
    this.#awaitCanvasBeforeStart = awaitCanvasBeforeStart;

    this.#canvasReadyPromise = new Promise<void>((resolve) => {
      this.#resolveCanvasReady = resolve;
    });

    if (this.#isCanvasReady) {
      this.#resolveCanvasReady?.();
      this.#resolveCanvasReady = null;
    }
  }

  public getCanvas(): HTMLCanvasElement {
    if (this.#canvas !== null) {
      return this.#canvas;
    }

    throw new Error("Engine canvas is not ready yet. Call startEngine() after canvas registration.");
  }

  public setCanvas(canvas: HTMLCanvasElement): void {
    this.#canvas = canvas;
    this.#isCanvasReady = true;

    this.#resolveCanvasReady?.();
    this.#resolveCanvasReady = null;
  }

  public removeCanvas(canvas: HTMLCanvasElement): void {
    if (this.#canvas !== canvas) {
      return;
    }

    this.#canvas = null;
    this.#isCanvasReady = false;
  }

  public async waitForCanvasReady(): Promise<void> {
    if (!this.#awaitCanvasBeforeStart) {
      return;
    }

    if (this.#isCanvasReady) {
      return;
    }

    await this.#canvasReadyPromise;
  }
}

/***** COMPONENT START *****/
export class EngineClass<
  TSystems extends SystemFactoryTuple,
  TScenes extends SceneDefinitionTuple = [],
  TAssets extends Record<string, unknown> = Record<string, unknown>,
> {
  #systems: Record<string, EngineSystem<any>>;
  #systemsView: Record<string, EngineSystem<any>>;
  #canvasManager: CanvasManager;

  // Cached sorted list for update phase systems
  #updateSystems: EngineSystem<any>[] = [];
  #renderPipeline: RenderPipeline | null;

  #currentPhase: "update" | "render" | null = null;
  #phaseFn = (phase: "update" | "render") => phase === this.#currentPhase;

  private initializationSystem: EngineInitializationSystem | null = null;
  private initialized = false;

  /**
   * Scene manager for handling scene lifecycle and transitions.
   * Use `engine.scene.set("name")` to transition between scenes.
   */
  public readonly scene: SceneManager<TScenes>;

  /**
   * Asset manager for handling loading and caching of resources.
   */
  public readonly assets: AssetManager<TAssets>;

  /** Render pipeline executed during frame ticks. */
  public readonly render: RenderPipeline | null;

  public frame: FrameStats = {
    updateDelta: 0,
    frameDelta: 0,
    phase: () => false,
    fps: 60,
    ups: 60,
    initialFPS: 60,
    initialUPS: 60,
    updateProgress: 0,
    lastUpdateTime: 0,
  };

  public constructor(
    systems: Record<string, EngineSystem<any>>,
    scenes: SceneDefinitionTuple = [],
    assets: AssetManager<TAssets>,
    renderPipeline: RenderPipeline | null,
    canvas: HTMLCanvasElement | null,
    awaitCanvasBeforeStart = false,
  ) {
    this.#systems = systems;
    this.scene = new SceneManager<TScenes>(scenes);
    this.scene.setEngineRef(this);
    this.assets = assets;
    this.#renderPipeline = renderPipeline;
    this.#canvasManager = new CanvasManager(canvas, awaitCanvasBeforeStart);
    this.render = renderPipeline;

    this.frame.phase = this.#phaseFn;

    // Provide a stable view that can resolve both engine systems and
    // active-scene systems by name.
    this.#systemsView = new Proxy(this.#systems, {
      get: (target, prop) => {
        if (typeof prop !== "string") return (target as any)[prop];
        if (prop in target) return (target as any)[prop];
        return this.scene.getActiveSystem(prop);
      },
      has: (target, prop) => {
        if (typeof prop !== "string") return prop in target;
        return prop in target || this.scene.getActiveSystem(prop) !== undefined;
      },
    });

    this.precomputeSystemOrder();
  }

  private precomputeSystemOrder() {
    const allSystems = Object.values(this.#systems);

    const getPriority = (system: EngineSystem<any>): number => system.priority;

    this.#updateSystems = allSystems.sort((a, b) => getPriority(b) - getPriority(a));
  }

  /** Prefer `useSystem()` in systems instead. */
  public get systems(): AllSystems<TSystems, TScenes> {
    return this.#systemsView as any;
  }

  /** Get registered scenes */
  public get scenes(): ScenesTupleToRecord<TScenes> {
    return this.scene.all as any;
  }

  /** Prefer `useWorld()` in systems instead. Returns the active scene's world. */
  public get world(): UserWorld {
    return this.scene.world;
  }

  /** Active render canvas used by pointer/canvas-space engine utilities. */
  public get canvas(): HTMLCanvasElement {
    return this.#canvasManager.getCanvas();
  }

  public setCanvas(canvas: HTMLCanvasElement): void {
    this.#canvasManager.setCanvas(canvas);
  }

  public removeCanvas(canvas: HTMLCanvasElement): void {
    this.#canvasManager.removeCanvas(canvas);
  }

  private async waitForCanvasReady(): Promise<void> {
    await this.#canvasManager.waitForCanvasReady();
  }

  public async initialize(): Promise<void> {
    if (this.initialized) return;

    await executeWithContext({ engine: this, scene: this.scene.context }, async () => {
      // Run initialization system if provided
      if (this.initializationSystem) {
        await this.initializationSystem.system();
      }

      // Initialize all systems
      for (const system of Object.values(this.#systems)) {
        executeSystemInitialize(system);
      }

      this.#renderPipeline?.initialize();
    });

    this.initialized = true;
  }

  public async *startEngine(opts?: StartEngineOpts): StartEngineGenerator {
    await this.waitForCanvasReady();

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
      if (typeof window !== "undefined" && window.requestAnimationFrame) {
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
      const updateTolerance = updateTime * 0.15;

      const updateShouldRun = updateDelta >= updateTime - updateTolerance;
      const frameShouldRun = frameDelta >= frameTime - frameTolerance;

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
          // Render is always run before update when both are scheduled in a single tick.
          if (frameState.shouldUpdate) {
            this.runRenderPipeline(frameState.shouldUpdate);
          }
          if (updateState.shouldUpdate) {
            this.runUpdateSystems(updateState.shouldUpdate);
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

  private runRenderPipeline(shouldUpdate: boolean): void {
    if (!shouldUpdate) return;
    if (!this.#renderPipeline) return;

    this.#currentPhase = "render";

    const activeSceneContext = this.scene.context;

    executeWithContext({ engine: this, scene: activeSceneContext }, () => {
      this.#renderPipeline?.render();
    });

    this.#currentPhase = null;
  }

  private runUpdateSystems(shouldUpdate: boolean) {
    if (!shouldUpdate) return;

    this.#currentPhase = "update";
    const systemsToRun = this.#updateSystems;

    const activeSceneContext = this.scene.context;
    const sceneSystemsToRun = this.scene.getUpdateSystems();

    executeWithContext({ engine: this, scene: activeSceneContext }, () => {
      // 1) Engine/global systems
      for (const system of systemsToRun) {
        if (!system.enabled) continue;
        system.system();
      }

      // 2) Scene-specific systems (active scene only)
      for (const system of sceneSystemsToRun) {
        if (!system.enabled) continue;
        system.system();
      }
    });

    this.#currentPhase = null;
  }
}
