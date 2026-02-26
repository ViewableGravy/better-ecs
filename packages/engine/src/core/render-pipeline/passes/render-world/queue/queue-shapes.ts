import { Shape } from "../../../../../components";
import type { UserWorld } from "../../../../../ecs/world";
import type { EngineFrameAllocatorRegistry, InternalFrameAllocator } from "../../../../../render";
import type { RenderQueue } from "../../../../../render";

export function queueShapes(
  world: UserWorld,
  queue: RenderQueue,
  frameAllocator: InternalFrameAllocator<EngineFrameAllocatorRegistry>,
): void {
  for (const id of world.query(Shape)) {
    const shape = world.get(id, Shape);
    if (!shape) {
      continue;
    }

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
