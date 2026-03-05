import { AnimatedSprite, Sprite } from "@engine/components";
import { FromRender, fromContext } from "@engine/context";
import type { EntityId } from "@engine/ecs/entity";
import type { UserWorld } from "@engine/ecs/world";
import type { EngineFrameAllocatorRegistry, InternalFrameAllocator, RenderQueue } from "@engine/render";

export function queueSprites(
  world: UserWorld = fromContext(FromRender.World),
  queue: RenderQueue = fromContext(FromRender.Queue),
  frameAllocator: InternalFrameAllocator<EngineFrameAllocatorRegistry> = fromContext(
    FromRender.FrameAllocator,
  ),
): void {
  world.forEach(Sprite, (id, sprite) => {
    queueSpriteCommand(id, sprite, world, queue, frameAllocator);
  });

  world.forEach(AnimatedSprite, (id, sprite) => {
    if (world.has(id, Sprite)) {
      return;
    }

    queueSpriteCommand(id, sprite, world, queue, frameAllocator);
  });
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
