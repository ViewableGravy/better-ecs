import { FPSPass } from "@/plugins/fps";
import { invariantById } from "@/utilities/selectors";
import { createRenderPipeline, useAssets } from "@repo/engine";
import { Canvas2DRenderer, FrameAllocator } from "@repo/engine/render";
import { ApplyContextVisualsPass } from "./passes/ApplyContextVisualsPass";
import { BeginFramePass } from "./passes/BeginFramePass";
import { EndFramePass } from "./passes/EndFramePass";
import { RenderWorldPass } from "./passes/RenderWorldPass";
import { ActiveWorldProvider } from "./world-provider";

export const Render = createRenderPipeline({
  initializeContext() {
    const canvas = getResizeableCanvas();
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
function getResizeableCanvas(): HTMLCanvasElement {
  const canvas = invariantById<HTMLCanvasElement>("game");

  // Handle canvas resize
  function resizeCanvas(): void {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  return canvas;
}
