import { drawDebugGrid } from "@client/render/passes/debug.draw-grid/utilities";
import { createRenderPass } from "@engine";

export const DrawGridPass = createRenderPass("debug:draw-grid")({
  execute({ renderer }) {
    drawDebugGrid(renderer);
  },
});