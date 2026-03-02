import type { EngineClass } from "@engine/core/engine";
import type { RegisteredEngine } from "@engine/core/engine-types";
import type { AnyRenderPipelineContext } from "@engine/core/render-pipeline";
import type { SceneContext } from "@engine/core/scene/scene-context";

/***** TYPE DEFINITIONS *****/
type Context = {
  engine: RegisteredEngine | null;
  scene: SceneContext | null;
  render: object | null;
};

type LooseContext = {
  engine: EngineClass<any, any, any, any> | null;
  scene: SceneContext | null;
  render: object | null;
};

/***** CONSTS *****/
const context: Context = {
  engine: null,
  scene: null,
  render: null,
};

export function setContext(cb: (ctx: Context) => void) {
  cb(context);
}

function resetContext() {
  setContext((ctx) => {
    ctx.engine = null;
    ctx.scene = null;
    ctx.render = null;
  });
}

function assignContextValue<TKey extends keyof Context>(key: TKey, value: Context[TKey]) {
  setContext((ctx) => {
    ctx[key] = value;
  });
}

export function setContextRender<TRenderContext extends object>(
  render: TRenderContext | null,
): object | null {
  const previous = context.render;
  assignContextValue("render", render);
  return previous;
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

/**
 * Returns the render context from the current execution context.
 * Throws if called outside of render pipeline execution.
 */
export function getContextRender(): AnyRenderPipelineContext {
  if (!context.render) {
    throw new Error('fromContext({ type: "render" }) called outside of render pipeline execution context');
  }

  return context.render as AnyRenderPipelineContext;
}
