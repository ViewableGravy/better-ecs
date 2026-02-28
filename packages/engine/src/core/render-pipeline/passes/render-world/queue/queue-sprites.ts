import { Sprite } from "../../../../../components";
import { FromRender, fromContext } from "../../../../../context";
import type { UserWorld } from "../../../../../ecs/world";
import type { EngineFrameAllocatorRegistry, InternalFrameAllocator, RenderQueue } from "../../../../../render";

export function queueSprites(
  world: UserWorld = fromContext(FromRender.World),
  queue: RenderQueue = fromContext(FromRender.Queue),
  frameAllocator: InternalFrameAllocator<EngineFrameAllocatorRegistry> = fromContext(
    FromRender.FrameAllocator,
  ),
): void {
  for (const id of world.query(Sprite)) {
    const sprite = world.require(id, Sprite);

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
