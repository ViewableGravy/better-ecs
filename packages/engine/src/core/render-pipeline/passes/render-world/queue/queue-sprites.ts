import { Sprite } from "../../../../../components";
import type { UserWorld } from "../../../../../ecs/world";
import type { EngineFrameAllocatorRegistry, InternalFrameAllocator } from "../../../../../render";
import type { RenderQueue } from "../../../../../render";

export function queueSprites(
  world: UserWorld,
  queue: RenderQueue,
  frameAllocator: InternalFrameAllocator<EngineFrameAllocatorRegistry>,
): void {
  for (const id of world.query(Sprite)) {
    const sprite = world.get(id, Sprite);
    if (!sprite) {
      continue;
    }

    const command = frameAllocator.acquire("engine:render-command");
    command.type = "sprite-entity";
    command.world = world;
    command.entityId = id;
    command.shape = null;
    command.layer = sprite.layer;
    command.zOrder = sprite.zOrder;

    queue.add(command);
  }
}
