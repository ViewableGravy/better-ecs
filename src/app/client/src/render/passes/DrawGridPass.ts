import { createRenderPass } from "@engine";
import { drawGrid } from "@client/render/stages/DrawGrid";

export const DrawGridPass = createRenderPass("draw-grid")({
  execute({ registry, renderer, queue, frameAllocator }) {
    drawGrid(registry, renderer, queue, frameAllocator);
  },
});
