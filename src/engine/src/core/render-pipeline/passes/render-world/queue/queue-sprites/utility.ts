import type { SpriteRenderRecord } from "@engine/core/render-pipeline/passes/render-world/sprite-render-record";
import type { EntityId } from "@engine/ecs/entity";
import type { UserWorld } from "@engine/ecs/world";
import type { EngineFrameAllocatorRegistry, InternalFrameAllocator, RenderQueue } from "@engine/render";

export function queueSpriteCommand(
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

export function pushSpriteRecord(records: SpriteRenderRecord[], record: SpriteRenderRecord): number {
  records.push(record);
  return records.length - 1;
}