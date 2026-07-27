/**
 * Render pass that draws worker-simulated conveyor items via instanced buckets.
 */

import { conveyorPresentation } from "@legacy/scenes/conveyor-worker/presentation";
import { createRenderPass } from "@engine";

export const DrawConveyorItemsPass = createRenderPass("draw-conveyor-items")({
  execute({ renderer }) {
    conveyorPresentation.draw(renderer);
  },
});
