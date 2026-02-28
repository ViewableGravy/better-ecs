import { Shape } from "@components";
import { FromRender, fromContext } from "@context";
import type { UserWorld } from "@ecs/world";
import type { EngineFrameAllocatorRegistry, InternalFrameAllocator, RenderQueue } from "@render";

export function queueShapes(
  world: UserWorld = fromContext(FromRender.World),
  queue: RenderQueue = fromContext(FromRender.Queue),
  frameAllocator: InternalFrameAllocator<EngineFrameAllocatorRegistry> = fromContext(
    FromRender.FrameAllocator,
  ),
): void {
  for (const id of world.query(Shape)) {
    const shape = world.require(id, Shape);

    const command = frameAllocator.acquire("engine:render-command");
    command.type = "shape-entity";
    command.world = world;
    command.entityId = id;
    command.shape = null;
    command.layer = shape.layer;
    command.zOrder = shape.zOrder;

    queue.add(command);
  }
}
