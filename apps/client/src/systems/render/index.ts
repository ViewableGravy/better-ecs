import { FPSPass } from "@/plugins/fps";
import { createRenderPipeline, useAssets, useEngine } from "@repo/engine";
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

    const assets = useAssets();
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
  const { canvas } = useEngine();
  return canvas;
}
