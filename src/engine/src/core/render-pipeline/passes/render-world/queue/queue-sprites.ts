import { AnimatedSprite, Sprite } from "@engine/components";
import { getFrameAssetIdAtTime } from "@engine/components/sprite/animated";
import { FromRender, fromContext } from "@engine/context";
import type { SpriteRenderRecord } from "@engine/core/render-pipeline/passes/render-world/sprite-render-record";
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
  const spriteRecords = frameAllocator.scratch<SpriteRenderRecord>("engine:sprite-render-records");
  const sampledTimeMs = performance.now();

  world.forEach(Sprite, (id, sprite) => {
    const record = frameAllocator.acquire("engine:sprite-render-record");
    writeSpriteRecord(record, sprite.assetId, sprite);
    const spriteRecordIndex = pushSpriteRecord(spriteRecords, record);

    queueSpriteCommand(id, world, sprite.layer, sprite.zOrder, spriteRecordIndex, queue, frameAllocator);
  });

  world.forEach(AnimatedSprite, (id, animatedSprite) => {
    if (world.has(id, Sprite)) {
      return;
    }

    const record = frameAllocator.acquire("engine:sprite-render-record");
    const sampledAssetId = getFrameAssetIdAtTime(animatedSprite, sampledTimeMs);
    writeSpriteRecord(record, sampledAssetId, animatedSprite);
    const spriteRecordIndex = pushSpriteRecord(spriteRecords, record);

    queueSpriteCommand(
      id,
      world,
      animatedSprite.layer,
      animatedSprite.zOrder,
      spriteRecordIndex,
      queue,
      frameAllocator,
    );
  });
}

function queueSpriteCommand(
  entityId: EntityId,
  world: UserWorld,
  layer: number,
  zOrder: number,
  spriteRecordIndex: number,
  queue: RenderQueue,
  frameAllocator: InternalFrameAllocator<EngineFrameAllocatorRegistry>,
): void {
  const command = frameAllocator.acquire("engine:render-command");
  command.type = "sprite-entity";
  command.world = world;
  command.entityId = entityId;
  command.shape = null;
  command.layer = layer;
  command.zOrder = zOrder;
  command.spriteRecordIndex = spriteRecordIndex;

  queue.add(command);
}

function pushSpriteRecord(records: SpriteRenderRecord[], record: SpriteRenderRecord): number {
  records.push(record);
  // Return the index of the record we just appended.
  // Array length is 1-based count, so the last valid index is `length - 1`.
  return records.length - 1;
}

function writeSpriteRecord(
  record: SpriteRenderRecord,
  assetId: string,
  sprite: Sprite,
): void {
  // Stage 2 intentionally does a full field copy every frame to establish record staging first.
  // Differential field writes (only update changed fields + dirty bits) are planned for Phase 3.
  const target = record.sprite;
  target.assetId = assetId;
  target.width = sprite.width;
  target.height = sprite.height;
  target.anchorX = sprite.anchorX;
  target.anchorY = sprite.anchorY;
  target.flipX = sprite.flipX;
  target.flipY = sprite.flipY;
  target.layer = sprite.layer;
  target.zOrder = sprite.zOrder;
  target.tint.r = sprite.tint.r;
  target.tint.g = sprite.tint.g;
  target.tint.b = sprite.tint.b;
  target.tint.a = sprite.tint.a;
}
