import { drawGrid } from "@client/render/stages/draw-grid";
import { createRenderPass } from "@engine";

export const DrawGridPass = createRenderPass("main:draw-grid")({
  execute({ registry, renderer, queue, frameAllocator }) {
    drawGrid(registry, renderer, queue, frameAllocator);
  },
});
