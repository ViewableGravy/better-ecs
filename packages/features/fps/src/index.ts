import { createSystem, useEngine, useOverloadedSystem } from '@repo/engine';
import type { EngineSystem } from '@repo/engine';
import { initialize } from './initialize';
import { render } from './render';
import { update } from './update';
import { schema, type Opts, type FPSCounterData } from './types';

const defaultState: FPSCounterData = {
  fpsBuffer: { start: null, frames: 0 },
  upsBuffer: { start: null, updates: 0 },
  fps: [],
  ups: [],
  mode: "default",
  customFps: null,
  customUps: null
};

export const System = (opts: Opts) => {
  return createSystem("plugin:fps-counter")({
    system: EntryPoint,
    initialize: () => initialize(opts.element),
    priority: 1,
    phase: "all",
    schema: {
      schema: schema,
      default: { ...defaultState, mode: opts.defaultMode ?? defaultState.mode }
    }
  });

  function EntryPoint() {
    const engine = useEngine();
    const { data } = useOverloadedSystem<EngineSystem<typeof schema>>("plugin:fps-counter");
    const now = performance.now();

    if (data.customFps !== null && engine.frame.fps !== data.customFps) {
      engine.frame.fps = data.customFps;
    }

    if (data.customUps !== null && engine.frame.ups !== data.customUps) {
      engine.frame.ups = data.customUps;
    }

    if (!data.upsBuffer.start) {
      data.upsBuffer.start = now;
    }
    if (!data.fpsBuffer.start) {
      data.fpsBuffer.start = now;
    }

    if (engine.frame.phase("update")) {
      return update(opts);
    }

    if (engine.frame.phase("render")) {
      return render(opts);
    }
  }
}

export type { FPSCounterData };

