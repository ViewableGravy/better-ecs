import { createRenderPass } from "@engine";
import { Engine, fromContext } from "@engine/context";
import { SpatialContexts } from "@lib/spatial-contexts";
import { drawGrid } from "@client/render/stages/DrawGrid";

export const DrawGridPass = createRenderPass("draw-grid")({
  scope: "world",
  execute({ world, renderer, queue, frameAllocator }) {
    const engine = fromContext(Engine);
    const manager = SpatialContexts.getManager(engine.scene.context);
    const focusedWorld = manager ? manager.focusedWorld : engine.world;

    if (focusedWorld !== world) {
      return;
    }

    drawGrid(world, renderer, queue, frameAllocator);
  },
});
