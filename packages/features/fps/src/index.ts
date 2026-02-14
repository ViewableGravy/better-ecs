import {
  createSystem,
  useEngine,
  useOverloadedSystem,
  type EngineSystem,
  type RenderPass,
} from "@repo/engine";
import { initialize } from "./initialize";
import { render } from "./render";
import { schema, type FPSCounterData, type Opts } from "./types";
import { update } from "./update";

const defaultState: FPSCounterData = {
  fpsBuffer: { start: null, frames: 0 },
  upsBuffer: { start: null, updates: 0 },
  fps: [],
  ups: [],
  mode: "default",
  customFps: null,
  customUps: null,
};

let currentOptions: Opts | null = null;

export const System = (opts: Opts) => {
  return createSystem("plugin:fps-counter")({
    system: EntryPoint,
    initialize: () => {
      currentOptions = opts;
      initialize(opts.element);
    },
    priority: 1,
    phase: "update",
    schema: {
      schema: schema,
      default: { ...defaultState, mode: opts.defaultMode ?? defaultState.mode },
    },
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

    update(opts);
  }
};

export const createFPSRenderPass = (): RenderPass => {
  return {
    name: "plugin:fps-counter:ui",
    execute() {
      if (!currentOptions) {
        return;
      }

      render(currentOptions);
    },
  };
};

export type { FPSCounterData };
