import { AnimatedSprite, Sprite } from "@components";
import { FromRender, fromContext } from "@context";
import type { EntityId } from "@ecs/entity";
import type { UserWorld } from "@ecs/world";
import type { EngineFrameAllocatorRegistry, InternalFrameAllocator, RenderQueue } from "@render";

export function queueSprites(
  world: UserWorld = fromContext(FromRender.World),
  queue: RenderQueue = fromContext(FromRender.Queue),
  frameAllocator: InternalFrameAllocator<EngineFrameAllocatorRegistry> = fromContext(
    FromRender.FrameAllocator,
  ),
): void {
  for (const id of world.query(Sprite)) {
    const sprite = world.require(id, Sprite);
    queueSpriteCommand(id, sprite, world, queue, frameAllocator);
  }

  for (const id of world.query(AnimatedSprite)) {
    if (world.has(id, Sprite)) {
      continue;
    }

    const sprite = world.require(id, AnimatedSprite);
    queueSpriteCommand(id, sprite, world, queue, frameAllocator);
  }
}

function queueSpriteCommand(
  entityId: EntityId,
  sprite: Sprite,
  world: UserWorld,
  queue: RenderQueue,
  frameAllocator: InternalFrameAllocator<EngineFrameAllocatorRegistry>,
): void {
  const command = frameAllocator.acquire("engine:render-command");
  command.type = "sprite-entity";
  command.world = world;
  command.entityId = entityId;
  command.shape = null;
  command.layer = sprite.layer;
  command.zOrder = sprite.zOrder;

  queue.add(command);
}
