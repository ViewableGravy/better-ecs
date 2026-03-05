import { Shape } from "@engine/components";
import { FromRender, fromContext } from "@engine/context";
import type { UserWorld } from "@engine/ecs/world";
import type { EngineFrameAllocatorRegistry, InternalFrameAllocator, RenderQueue } from "@engine/render";

export function queueShapes(
  world: UserWorld = fromContext(FromRender.World),
  queue: RenderQueue = fromContext(FromRender.Queue),
  frameAllocator: InternalFrameAllocator<EngineFrameAllocatorRegistry> = fromContext(
    FromRender.FrameAllocator,
  ),
): void {
  world.forEach(Shape, (id, shape) => {
    const command = frameAllocator.acquire("engine:render-command");
    command.type = "shape-entity";
    command.world = world;
    command.entityId = id;
    command.shape = null;
    command.layer = shape.layer;
    command.zOrder = shape.zOrder;

    queue.add(command);
  });
}
