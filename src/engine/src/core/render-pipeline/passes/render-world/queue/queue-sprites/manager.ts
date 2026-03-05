import { Sprite } from "@engine/components";
import { Transform2D } from "@engine/components/transform";
import { SpriteRenderRecordCache } from "@engine/core/render-pipeline/passes/render-world/queue/queue-sprites/cache";
import { pushSpriteRecord, queueSpriteCommand } from "@engine/core/render-pipeline/passes/render-world/queue/queue-sprites/utility";
import { writeSpriteRecord, writeTransformRecord } from "@engine/core/render-pipeline/passes/render-world/queue/queue-sprites/writers";
import {
  isSpriteWithinCullingBounds,
  type CullingBounds as CullingBoundsValue
} from "@engine/core/render-pipeline/passes/render-world/render/culling/utils";
import type { SpriteRenderRecord } from "@engine/core/render-pipeline/passes/render-world/sprite-render-record";
import type { EntityId } from "@engine/ecs/entity";
import { resolveWorldTransform2D } from "@engine/ecs/hierarchy";
import type { UserWorld } from "@engine/ecs/world";
import type { EngineFrameAllocatorRegistry, InternalFrameAllocator, RenderQueue } from "@engine/render";

/***** COMPONENT START *****/
export class QueueSpriteEntityManager {
  private static _shared_queue_transform = new Transform2D();
  private static _instance: QueueSpriteEntityManager | null = null;

  private constructor(
    private world: UserWorld,
    private alpha: number,
    private cullingBounds: CullingBoundsValue | null,
    private renderQueue: RenderQueue,
    private frameAllocator: InternalFrameAllocator<EngineFrameAllocatorRegistry>,
    private spriteRecords: SpriteRenderRecord[],
  ) {}

  public static instance(
    world: UserWorld,
    alpha: number,
    cullingBounds: CullingBoundsValue | null,
    renderQueue: RenderQueue,
    frameAllocator: InternalFrameAllocator<EngineFrameAllocatorRegistry>,
    spriteRecords: SpriteRenderRecord[],
  ): QueueSpriteEntityManager {
    if (!QueueSpriteEntityManager._instance) {
      QueueSpriteEntityManager._instance = new QueueSpriteEntityManager(
        world,
        alpha,
        cullingBounds,
        renderQueue,
        frameAllocator,
        spriteRecords,
      );
    } else {
      QueueSpriteEntityManager._instance.world = world;
      QueueSpriteEntityManager._instance.alpha = alpha;
      QueueSpriteEntityManager._instance.cullingBounds = cullingBounds;
      QueueSpriteEntityManager._instance.renderQueue = renderQueue;
      QueueSpriteEntityManager._instance.frameAllocator = frameAllocator;
      QueueSpriteEntityManager._instance.spriteRecords = spriteRecords;
    }

    return QueueSpriteEntityManager._instance;
  }

  public queue(entityId: EntityId, sprite: Sprite): void {  
    if (!resolveWorldTransform2D(this.world, entityId, QueueSpriteEntityManager._shared_queue_transform)) {
      return;
    }
  
    const cache = SpriteRenderRecordCache.instance();
    const record = cache.resolveRecord(this.world, entityId);
  
    // TODO: just pass sprite instead of new allocation
    record.dirtyMask = writeSpriteRecord(record, { assetId: sprite.assetId, sprite }) 
      | writeTransformRecord(record, QueueSpriteEntityManager._shared_queue_transform);
  
    record.isVisible = isSpriteWithinCullingBounds(this.cullingBounds, record.worldTransform, this.alpha, record);
    if (!record.isVisible) {
      return;
    }
  
    const spriteRecordIndex = pushSpriteRecord(this.spriteRecords, record);
    queueSpriteCommand(entityId, this.world, sprite.layer, sprite.zOrder, spriteRecordIndex, this.renderQueue, this.frameAllocator);
  }
}