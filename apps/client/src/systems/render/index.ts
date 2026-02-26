import { FPSPass } from "@/plugins/fps";
import { createRenderPipeline } from "@repo/engine";
import { fromContext, Assets, Engine } from "@repo/engine/context";
import { Canvas2DRenderer, FrameAllocator } from "@repo/engine/render";
import { ApplyContextVisualsPass } from "./passes/ApplyContextVisualsPass";
import { DrawGridPass } from "./passes/DrawGridPass";
import { ActiveWorldProvider } from "./world-provider";

export const Render = createRenderPipeline({
  initializeContext() {
    const { canvas } = fromContext(Engine);
    const renderer = new Canvas2DRenderer();

    const assets = fromContext(Assets);
    renderer.initialize(canvas, assets);

    return {
      renderer,
      worldProvider: new ActiveWorldProvider(),
      frameAllocator: new FrameAllocator(),
    };
  },
  beforeWorldPasses: [
    ApplyContextVisualsPass,
  ],
  afterWorldPasses: [
    DrawGridPass,
    FPSPass,
  ],
});
