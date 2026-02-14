import { createRenderPass } from "@repo/engine";
import { collectRenderables } from "../stages/CollectRenderables";
import { commitWorld } from "../stages/Commit";
import { sortRenderQueue } from "../stages/Sort";

export const RenderWorldPass = createRenderPass("draw")({
  scope: "world",
  execute({ world, queue, renderer, alpha }) {
    queue.clear();
    collectRenderables(world, queue);
    sortRenderQueue(world, queue);
    commitWorld(world, renderer, queue, alpha);
  },
});
