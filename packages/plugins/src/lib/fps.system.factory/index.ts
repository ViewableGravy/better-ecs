import { createSystem, useEngine, useOverloadedSystem } from '@repo/engine';
import type { EngineSystem } from '@repo/engine';
import { initialize } from './initialize';
import { render } from './render';
import { update } from './update';
import { schema, type Opts } from './types';

export const System = (opts: Opts) => {
  return createSystem("plugin:fps-counter")({
    system: EntryPoint,
    initialize: () => initialize(opts.element),
    priority: 1,
    phase: "all",
    schema: {
      schema: schema,
      default: {
        fpsBuffer: { start: null, frames: 0 }, 
        upsBuffer: { start: null, updates: 0 }, 
        fps: [],
        ups: []
      }
    }
  });

  function EntryPoint() {
    const engine = useEngine();
    const { data } = useOverloadedSystem<EngineSystem<typeof schema>>("plugin:fps-counter");
    const now = performance.now();

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

