import { createSystem, useEngine, useOverloadedSystem } from '@repo/engine';
import type { EngineSystem } from '@repo/engine/core/register/system';
import { z } from 'zod';
import { initialize } from './index.initialize';
import { render } from './index.render';
import { update } from './index.update';

/***** SCHEMA *****/
export const schema = z.object({
  fps: z.array(z.number()),
  ups: z.array(z.number()),
  fpsBuffer: z.object({
    start: z.number().nullable(),
    frames: z.number(),
  }),
  upsBuffer: z.object({
    start: z.number().nullable(),
    updates: z.number(),
  }),
});

export type FPSCounterData = z.infer<typeof schema>;

/***** TYPE DEFINITIONS *****/
export type Opts = {
  element: HTMLElement;
  barCount?: number;
  rate?: number;
  round?: boolean;
  simpleModeToggleKey?: string;
};

export const System = (opts: Opts) => {
  return createSystem("engine:fps-counter")({
    system: EntryPoint,
    initialize: () => initialize(opts.element, opts.simpleModeToggleKey),
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
    const { data } = useOverloadedSystem<EngineSystem<typeof schema>>("engine:fps-counter");
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

