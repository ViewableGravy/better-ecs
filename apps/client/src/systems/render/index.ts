import { FPSPass } from "@/plugins/fps";
import { createRenderPipeline } from "@repo/engine";
import { fromContext, Assets, Engine } from "@repo/engine/context";
import { Canvas2DRenderer, FrameAllocator } from "@repo/engine/render";
import { ApplyContextVisualsPass } from "./passes/ApplyContextVisualsPass";
import { BeginFramePass } from "./passes/BeginFramePass";
import { EndFramePass } from "./passes/EndFramePass";
import { RenderWorldPass } from "./passes/RenderWorldPass";
import { ActiveWorldProvider } from "./world-provider";

export const Render = createRenderPipeline({
  initializeContext() {
    const canvas = getResizableCanvas();
    const renderer = new Canvas2DRenderer();

    const assets = fromContext(Assets);
    renderer.initialize(canvas, assets);

    return {
      renderer,
      worldProvider: new ActiveWorldProvider(),
      frameAllocator: new FrameAllocator({}),
    };
  },
  passes: [
    BeginFramePass, 
    ApplyContextVisualsPass, 
    RenderWorldPass, 
    FPSPass, 
    EndFramePass
  ],
});

// Utility function to get the canvas and handle resizing
function getResizableCanvas(): HTMLCanvasElement {
  const { canvas } = fromContext(Engine);
  return canvas;
}
