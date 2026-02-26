import { createRenderPass, useEngine } from "@repo/engine";
import { SpatialContexts } from "@repo/spatial-contexts";
import { drawGrid } from "../stages/DrawGrid";

export const DrawGridPass = createRenderPass("draw-grid")({
  scope: "world",
  execute({ world, renderer }) {
    const engine = useEngine();
    const manager = SpatialContexts.getManager(engine.scene.context);
    const focusedWorld = manager ? manager.focusedWorld : engine.world;

    if (focusedWorld !== world) {
      return;
    }

    drawGrid(world, renderer);
  },
});
