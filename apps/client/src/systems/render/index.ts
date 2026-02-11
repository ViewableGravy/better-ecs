import { invariantById } from "@/utilities/selectors";
import {
  CommandBuffer,
  createRenderPipeline,
  RenderPipelineContext,
  useAssets,
} from "@repo/engine";
import { Canvas2DRenderer } from "@repo/engine/render";
import type { RenderCommand, View2D } from "./render/Commands";
import { CollectShapesStage } from "./stages/CollectShapes";
import { CollectSpritesStage } from "./stages/CollectSprites";
import { CommitStage } from "./stages/Commit";
import { ExtractViewStage } from "./stages/ExtractView";
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

    const view: View2D = { x: 0, y: 0, zoom: 1 };

    return new RenderPipelineContext(renderer)
      .attach(new CommandBuffer<RenderCommand>())
      .attach({ alpha: 0, view });
  },
  stages: [
    ExtractViewStage, 
    CollectShapesStage,
    CollectSpritesStage,
    SortStage, 
    CommitStage
  ],
});
