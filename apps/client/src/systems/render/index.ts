import { invariantById } from "@/utilities/selectors";
import { createRenderPipeline, RenderPipelineContext, useAssets } from "@repo/engine";
import { Canvas2DRenderer } from "@repo/engine/render";
import { CollectRenderablesStage } from "./stages/CollectRenderables";
import { CommitStage } from "./stages/Commit";
import { SortStage } from "./stages/Sort";

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

// prettier-ignore
export const System = createRenderPipeline("render")({
  initializeContext() {
    const canvas = getResizeableCanvas();
    const renderer = new Canvas2DRenderer();

    // Link the renderer to the engine's asset manager
    const assets = useAssets();
    renderer.initialize(canvas, assets);

    return new RenderPipelineContext(renderer);
  },
  stages: [CollectRenderablesStage, SortStage, CommitStage],
});
