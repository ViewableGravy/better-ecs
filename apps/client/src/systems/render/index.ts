import { FPSPass } from "@/plugins/fps";
import { createRenderPipeline } from "@repo/engine";
import { Assets, Engine, fromContext } from "@repo/engine/context";
import {
  Canvas2DRenderAPI,
  DEFAULT_RENDERER_CONFIG,
  FrameAllocator,
  Renderer2D,
} from "@repo/engine/render";
import { ApplyContextVisualsPass } from "./passes/ApplyContextVisualsPass";
import { DrawGridPass } from "./passes/DrawGridPass";
import { ActiveWorldProvider } from "./world-provider";

export const Render = createRenderPipeline({
  initializeContext() {
    const { canvas } = fromContext(Engine);
    const renderer = new Renderer2D(
      new Canvas2DRenderAPI(),
      DEFAULT_RENDERER_CONFIG,
    );

    const assets = fromContext(Assets);
    renderer.initialize(canvas, assets);

    return {
      renderer,
      worldProvider: new ActiveWorldProvider(),
      frameAllocator: new FrameAllocator(),
    };
  },
  passes: [
    ApplyContextVisualsPass,
    DrawGridPass,
  ],
  afterWorldPasses: [
    FPSPass,
  ],
});
