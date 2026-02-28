import type { EngineClass } from "./engine";
import type { RegisteredEngine } from "./engine-types";
import type { SceneContext } from "./scene/scene-context";

/***** TYPE DEFINITIONS *****/
type Context = {
  engine: RegisteredEngine | null;
  scene: SceneContext | null;
};

type LooseContext = {
  engine: EngineClass<any, any, any, any> | null;
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

/**
 * Returns the engine from the current execution context.
 * Throws if called outside of a system execution context.
 * @internal used by fromContext and internal engine systems
 */
export function getContextEngine(): RegisteredEngine {
  if (!context.engine) {
    throw new Error("fromContext() called outside of a system execution context");
  }

  return context.engine;
}
