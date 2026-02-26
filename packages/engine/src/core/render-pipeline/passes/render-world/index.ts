import { createRenderPass } from "../../pass";
import { queueShapes } from "./queue/queue-shapes";
import { queueSprites } from "./queue/queue-sprites";
import { renderCommands } from "./render/render-commands";
import { sortCommands } from "./sort/sort-commands";

export const RenderWorldPass = createRenderPass("world-render")({
  scope: "world",
  execute({ world, queue, renderer, alpha, frameAllocator }) {
    queueSprites(world, queue, frameAllocator);
    queueShapes(world, queue, frameAllocator);

    sortCommands(queue);
    renderCommands(queue, renderer, alpha, frameAllocator);
    queue.clear();
  },
});
