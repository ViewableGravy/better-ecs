import type { EngineInitializationSystem, EngineSystem } from "@repo/engine/core/register/system";
import { UserWorld, World } from "../../ecs/world";
import { executeWithContext } from "../context";
import type { EngineFrame, EngineUpdate, FrameStats, SystemFactoryTuple } from "../types";

type StartEngineOpts = {
  fps?: number;
  ups?: number;
  signal?: AbortSignal;
}

type StartEngineGenerator = AsyncGenerator<readonly [EngineUpdate, EngineFrame], void, unknown>;

export class EngineClass<TSystems extends SystemFactoryTuple = SystemFactoryTuple> {
  systems: Record<string, any>;
  private world: World;
  private initializationSystem: EngineInitializationSystem | null = null;
  private initialized: boolean = false;
  frame: FrameStats = {
    updateDelta: 0,
    frameDelta: 0,
    fps: 60,
    ups: 60,
    updateProgress: 0,
    lastUpdateTime: 0,
  };

  public constructor(systems: Record<string, any>) {
    this.systems = systems;
    this.world = new World();
  }

  /**
   * Intended for internal use only. Use `useWorld()` in systems instead.
   */
  public getWorld(): UserWorld {
    return new UserWorld(this.world);
  }

  private async runInitializationSystem(): Promise<void> {
    if (this.initialized || !this.initializationSystem) return;

    executeWithContext({ engine: this }, async () => {
      await this.initializationSystem!.system();
    });
  }

  /**
   * Execute the initialization system if it hasn't been run yet.
   */
  public async initializeEngine(): Promise<void> {
    await this.runInitializationSystem();
  }

  private runSystems(phase: "update" | "render", shouldUpdate: boolean) {
    if (!shouldUpdate) return;

    executeWithContext({ engine: this }, () => {
      for (const system of Object.values(this.systems)) {
        if (system.enabled && system.phase === phase) {
          system.system();
        }
      }
    });
  }

  public async *startEngine(opts?: StartEngineOpts): StartEngineGenerator {
    const frameTime = 1000 / (opts?.fps || 60);
    const updateTime = 1000 / (opts?.ups || 60);

    // Run initialization system if not already initialized
    await this.runInitializationSystem();

    // Store fps and ups on the engine for access in systems
    this.frame.fps = opts?.fps || 60;
    this.frame.ups = opts?.ups || 60;

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

    const requestAnimationFrame = (cb: (time: number) => void) => {
      if (typeof window !== 'undefined' && window.requestAnimationFrame) {
        return window.requestAnimationFrame(cb);
      }
      return setTimeout(() => cb(performance.now()), frameTime);
    };

    while (!opts?.signal?.aborted) {
      const now = await new Promise<number>(requestAnimationFrame);

      const updateDelta = now - lastUpdateTime;
      const frameDelta = now - lastFrameTime;

      const updateShouldRun = updateDelta >= updateTime;
      const frameShouldRun = frameDelta >= frameTime;

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

        // Run systems based on phase
        if (updateState.shouldUpdate) {
          this.runSystems("update", updateState.shouldUpdate);
          // Update lastUpdateTime immediately to prevent double-running updates
          lastUpdateTime = now;
          this.frame.lastUpdateTime = now;
          // Only allow one update per frame to ensure proper interpolation
          (updateState as any).shouldUpdate = false;
        }
        if (frameState.shouldUpdate) {
          this.runSystems("render", frameState.shouldUpdate);
        }

        yield [updateState, frameState] as const;

        if (frameShouldRun) {
          lastFrameTime = now;
        }
      }
    }
  }
}

export function createEngine<const TSystems extends SystemFactoryTuple>(opts: { 
  systems: TSystems;
  initialization?: EngineInitializationSystem;
}): EngineClass<TSystems> {
  // Create the engine instance
  const systemsRecord: Record<string, EngineSystem<any>> = {};

  // Initialize each system by calling its factory (no engine parameter needed)
  for (const factory of opts.systems) {
    const system = factory();
    systemsRecord[system.name] = system;
  }

  // Sort systems by phase (update before render)
  const sortedSystems = Object.entries(systemsRecord)
    .sort(([, a], [, b]) => {
      const phaseOrder = { update: 0, render: 1 };
      return phaseOrder[a.phase] - phaseOrder[b.phase];
    });
  
  const sortedSystemsRecord = Object.fromEntries(sortedSystems);

  // Create and return engine instance
  const engine = new EngineClass<TSystems>(sortedSystemsRecord);
  
  // Set initialization system if provided
  if (opts.initialization) {
    (engine as any).initializationSystem = opts.initialization;
  }
  
  // Return engine with type info for module augmentation
  return engine;
}
