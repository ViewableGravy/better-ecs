import {
  FromRender,
  fromContext
} from "../../../../context";
import { createRenderPass } from "../../pass";
import { queueGizmos } from "./queue/queue-gizmos";
import { queueShapes } from "./queue/queue-shapes";
import { queueSprites } from "./queue/queue-sprites";
import { renderCommands } from "./render/render-commands";
import { sortCommands } from "./sort/sort-commands";

export const RenderWorldPass = createRenderPass("world-render")({
  scope: "world",
  execute() {
    const world = fromContext(FromRender.World);
    const queue = fromContext(FromRender.Queue);
    const renderer = fromContext(FromRender.Renderer);
    const alpha = fromContext(FromRender.Alpha);
    const frameAllocator = fromContext(FromRender.FrameAllocator);

    queueSprites(world, queue, frameAllocator);
    queueShapes(world, queue, frameAllocator);
    queueGizmos(world, renderer, queue, frameAllocator);

    sortCommands(queue);
    renderCommands(queue, renderer, alpha, frameAllocator);
    queue.clear();
  },
});
