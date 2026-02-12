import type { UserWorld } from "../ecs/world";
import type { AllSceneNames, RegisteredAssetManager, RegisteredEngine } from "./engine-types";
import type { EngineClass } from "./register/internal";
import type { EngineSystem } from "./register/system";
import type { SceneContext } from "./scene/scene-context";

/***** TYPE DEFINITIONS *****/
type Context = {
  engine: RegisteredEngine | null;
  scene: SceneContext | null;
};

type LooseContext = {
  engine: EngineClass<any, any, any> | null;
  scene: SceneContext | null;
};

/***** CONSTS *****/
const context: Context = {
  engine: null,
  scene: null,
};

export function setContext(cb: (ctx: Context) => void) {
  cb(context);
}

function resetContext() {
  setContext((ctx) => {
    ctx.engine = null;
    ctx.scene = null;
  });
}

export function executeWithContext<T>(context: Partial<LooseContext>, fn: () => T): T {
  setContext((ctx) => {
    for (const key in context) {
      (ctx as any)[key] = (context as any)[key];
    }
  });

  let result: T | Promise<T>;
  try {
    result = fn();
  } catch (err) {
    resetContext();
    throw err;
  }

  if (result instanceof Promise) {
    return result.finally(resetContext) as any;
  }

  resetContext();
  return result as any;
}

export function useEngine(): RegisteredEngine {
  if (!context.engine) {
    throw new Error("useEngine() called outside of a system execution context");
  }

  return context.engine;
}

export function useDelta(): [updateDelta: number, frameDelta: number, updateProgress: number] {
  const engine = useEngine();
  return [engine.frame.updateDelta, engine.frame.frameDelta, engine.frame.updateProgress];
}

/**
 * Use a system by name with automatic type inference from the registered engine.
 * This hook uses the global Register interface to infer the system type.
 *
 * For plugins that need to manually specify types (because they don't have access
 * to the global Register), use `useOverloadedSystem` instead.
 */
export function useSystem<TSystem extends keyof RegisteredEngine["systems"]>(
  system: TSystem,
): RegisteredEngine["systems"][TSystem] {
  const engine = useEngine();
  return (engine.systems as any)[system];
}

/**
 * Use a system by name with an explicit type override.
 * This hook is designed for plugins that don't have access to the global Register
 * interface and need to manually specify the system type.
 *
 * @example
 * const { data } = useOverloadedSystem<EngineSystem<typeof schema>>("plugin:fps-counter");
 */
export function useOverloadedSystem<TOverride extends EngineSystem>(system: string): TOverride {
  const engine = useEngine();
  return (engine.systems as any)[system] as TOverride;
}

export function useWorld(): UserWorld {
  const engine = useEngine();
  return engine.world;
}

export function useScene(): SceneContext {
  if (!context.engine) {
    throw new Error("useScene() called outside of a system execution context");
  }

  if (!context.scene) {
    throw new Error("useScene() called outside of scene context (no active scene)");
  }

  return context.scene;
}

export function useAssets(): RegisteredAssetManager {
  const engine = useEngine();
  return engine.assets;
}

/**
 * Returns a function to transition to a scene by name.
 * This hook captures the engine context and returns a type-safe setter function.
 *
 * @example
 * ```ts
 * const setScene = useSetScene();
 *
 * // Later in the system:
 * await setScene("game");
 * ```
 */
export function useSetScene(): <TName extends AllSceneNames>(sceneName: TName) => Promise<void> {
  const engine = useEngine();
  return (sceneName) => (engine as any).scene.set(sceneName);
}
