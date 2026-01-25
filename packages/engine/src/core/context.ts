import type { UserWorld } from "@repo/engine/ecs/world";
import type { EngineSystem } from "./register/system";
import type { RegisteredEngine } from "./engine-types";

/***** TYPE DEFINITIONS *****/
type Context = {
  engine: RegisteredEngine | null;
}

/***** CONSTS *****/
const context: Context = {
  engine: null,
};

export function setContext(cb: (ctx: Context) => void) {
  cb(context);
}

function resetContext() {
  setContext((ctx) => {
    ctx.engine = null;
  });
}

export function executeWithContext<T>(context: Context, fn: () => T): T extends Promise<any> ? T : T {
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

export function useDelta(): [updateDelta: number, frameDelta: number] {
  const engine = useEngine();
  return [engine.frame.updateDelta, engine.frame.frameDelta];
}

/**
 * Use a system by name with automatic type inference from the registered engine.
 * This hook uses the global Register interface to infer the system type.
 * 
 * For plugins that need to manually specify types (because they don't have access
 * to the global Register), use `useOverloadedSystem` instead.
 */
export function useSystem<TSystem extends keyof RegisteredEngine['systems']>(
  system: TSystem
): RegisteredEngine['systems'][TSystem] {
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