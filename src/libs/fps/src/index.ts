import {
    createRenderPass,
    createSystem,
    type EngineSystem,
    type RenderPass,
    type SystemFactory,
} from "@engine";
import { Engine, fromContext, OverrideSystem } from "@engine/context";
import { initialize } from "@libs/fps/initialize";
import { syncEngineTargetRates } from "@libs/fps/rates";
import { render } from "@libs/fps/render";
import { type FPSCounterData, type Opts } from "@libs/fps/types";
import { update } from "@libs/fps/update";

const defaultState: FPSCounterData = {
  fpsBuffer: { start: null, frames: 0 },
  upsBuffer: { start: null, updates: 0 },
  fps: [],
  ups: [],
  mode: "disabled",
  customFps: null,
  customUps: null,
  lockRatesToLower: false,
};

export const System = (
  opts: Opts,
): SystemFactory<"plugin:fps-counter", FPSCounterData, Record<string, never>> => {
  return createSystem("plugin:fps-counter")({
    system: EntryPoint,
    initialize: () => initialize(opts.element),
    priority: 1,
    state: { ...defaultState, mode: opts.defaultMode ?? defaultState.mode },
  });

  function EntryPoint() {
    const engine = fromContext(Engine);
    const { data } = fromContext(OverrideSystem<EngineSystem<FPSCounterData>>("plugin:fps-counter"));
    const now = performance.now();

    syncEngineTargetRates(engine, data);

    if (!data.upsBuffer.start) {
      data.upsBuffer.start = now;
    }
    if (!data.fpsBuffer.start) {
      data.fpsBuffer.start = now;
    }

    update(opts);
  }
};

export type FPSPlugin = {
  system: SystemFactory<"plugin:fps-counter", FPSCounterData, Record<string, never>>;
  pass: RenderPass;
};

export function createFPS(opts: Opts): FPSPlugin {
  return {
    system: System(opts),
    pass: createRenderPass("plugin:fps-counter:ui")({
      execute() {
        render(opts);
      },
    }),
  };
}

export type { FPSCounterData, Opts };
