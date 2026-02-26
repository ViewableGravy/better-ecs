import { createRenderPass } from "../../pass";
import { queueShapes } from "./queue/queue-shapes";
import { queueSprites } from "./queue/queue-sprites";
import { renderShapes } from "./render/render-shapes";
import { renderSprites } from "./render/render-sprites";
import { sortShapes } from "./sort/sort-shapes";
import { sortSprites } from "./sort/sort-sprites";

export const RenderWorldPass = createRenderPass("world-render")({
  scope: "world",
  execute({ world, queue, renderer, alpha, frameAllocator }) {
    queue.clear();

    queueSprites(world, queue);
    queueShapes(world, queue);

    sortSprites(world, queue);
    sortShapes(world, queue);

    renderShapes(world, queue, renderer, alpha, frameAllocator);
    renderSprites(world, queue, renderer, alpha);
  },
});
