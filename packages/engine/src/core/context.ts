import type { UserWorld } from "@repo/engine/ecs/world";
import type { RegisteredEngine } from "./types";

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

export function executeWithContext<T>(context: Context, fn: () => T): void {
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
    return void result.finally(resetContext);
  }

  resetContext();
  return void result;
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

export function useSystem<TSystem extends keyof RegisteredEngine['systems']>(system: TSystem): RegisteredEngine['systems'][TSystem] {
  const engine = useEngine();
  return engine.systems[system];
}

export function useWorld(): UserWorld {
  const engine = useEngine();
  return engine.world;
}