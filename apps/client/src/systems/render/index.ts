import { invariantById } from "@/utilities/selectors";
import { createRenderPipeline, useAssets } from "@repo/engine";
import { Canvas2DRenderer, createFrameAllocator } from "@repo/engine/render";
import { createFPSRenderPass } from "@repo/fps";
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
      frameAllocator: createFrameAllocator({}),
    };
  },
  passes: [
    BeginFramePass,
    ApplyContextVisualsPass,
    RenderWorldPass,
    createFPSRenderPass(),
    EndFramePass,
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
