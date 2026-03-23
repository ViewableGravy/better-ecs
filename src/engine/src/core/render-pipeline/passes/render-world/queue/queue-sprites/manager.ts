import { resolveEntityTint, Sprite } from "@engine/components";
import { Rgba } from "@engine/components/sprite/sprite";
import {
    SpriteRenderRecordCache,
    type SpriteRenderRecordCacheEntry,
    type SpriteRenderRecordWorldState,
} from "@engine/core/render-pipeline/passes/render-world/queue/queue-sprites/cache";
import { pushSpriteRecord, queueSpriteCommand } from "@engine/core/render-pipeline/passes/render-world/queue/queue-sprites/utility";
import { writeSpriteRecord, writeTransformRecord } from "@engine/core/render-pipeline/passes/render-world/queue/queue-sprites/writers";
import {
    isSpriteWithinCullingBounds,
    type CullingBounds as CullingBoundsValue
} from "@engine/core/render-pipeline/passes/render-world/render/culling/utils";
import { SPRITE_RENDER_DIRTY_NONE, type SpriteRenderRecord } from "@engine/core/render-pipeline/passes/render-world/sprite-render-record";
import type { EntityId } from "@engine/ecs/entity";
import { getWorldTransform2D } from "@engine/ecs/hierarchy";
import type { UserWorld } from "@engine/ecs/world";
import type { EngineFrameAllocatorRegistry, InternalFrameAllocator, RenderQueue } from "@engine/render";

/***** COMPONENT START *****/
export class QueueSpriteEntityManager {
  private static _instance: QueueSpriteEntityManager | null = null;
  private static readonly SHARED_TINT = new Rgba(1, 1, 1, 1);

  private constructor(
    private cache: SpriteRenderRecordCache,
    private cacheState: SpriteRenderRecordWorldState,
    private world: UserWorld,
    private alpha: number,
    private cullingSignature: number,
    private cullingBounds: CullingBoundsValue | null,
    private renderQueue: RenderQueue,
    private frameAllocator: InternalFrameAllocator<EngineFrameAllocatorRegistry>,
    private spriteRecords: SpriteRenderRecord[],
  ) {}

  public static instance(
    cache: SpriteRenderRecordCache,
    cacheState: SpriteRenderRecordWorldState,
    world: UserWorld,
    alpha: number,
    cullingSignature: number,
    cullingBounds: CullingBoundsValue | null,
    renderQueue: RenderQueue,
    frameAllocator: InternalFrameAllocator<EngineFrameAllocatorRegistry>,
    spriteRecords: SpriteRenderRecord[],
  ): QueueSpriteEntityManager {
    if (!QueueSpriteEntityManager._instance) {
      QueueSpriteEntityManager._instance = new QueueSpriteEntityManager(
        cache,
        cacheState,
        world,
        alpha,
        cullingSignature,
        cullingBounds,
        renderQueue,
        frameAllocator,
        spriteRecords,
      );
    } else {
      QueueSpriteEntityManager._instance.cache = cache;
      QueueSpriteEntityManager._instance.cacheState = cacheState;
      QueueSpriteEntityManager._instance.world = world;
      QueueSpriteEntityManager._instance.alpha = alpha;
      QueueSpriteEntityManager._instance.cullingSignature = cullingSignature;
      QueueSpriteEntityManager._instance.cullingBounds = cullingBounds;
      QueueSpriteEntityManager._instance.renderQueue = renderQueue;
      QueueSpriteEntityManager._instance.frameAllocator = frameAllocator;
      QueueSpriteEntityManager._instance.spriteRecords = spriteRecords;
    }

    return QueueSpriteEntityManager._instance;
  }

  public queue(
    entityId: EntityId,
    sprite: Sprite,
    assetId: string = sprite.assetId,
    isAnimatedSprite = false,
  ): void {
    const entry = this.cache.resolveEntryFromState(this.cacheState, entityId);
    const worldTransform = getWorldTransform2D(this.world, entityId);

    if (!worldTransform) {
      return;
    }

    if (this.reuseStaticEntryIfPossible(entry, entityId, sprite, worldTransform, isAnimatedSprite)) {
      return;
    }

    const record = entry.record;
    const tint = resolveEntityTint(this.world, entityId, QueueSpriteEntityManager.SHARED_TINT);

    record.dirtyMask = writeSpriteRecord(record, assetId, sprite, tint)
      | writeTransformRecord(record, worldTransform);

    record.isVisible = isSpriteWithinCullingBounds(this.cullingBounds, record.worldTransform, this.alpha, record);
    if (!record.isVisible) {
      entry.lastCullingSignature = this.cullingSignature;
      entry.cohort = this.resolveEntryCohort(record, sprite, isAnimatedSprite);
      return;
    }

    entry.lastCullingSignature = this.cullingSignature;
    entry.cohort = this.resolveEntryCohort(record, sprite, isAnimatedSprite);

    const spriteRecordIndex = pushSpriteRecord(this.spriteRecords, record);
    queueSpriteCommand(
      entityId,
      this.world,
      assetId,
      sprite.layer,
      sprite.zOrder,
      spriteRecordIndex,
      this.renderQueue,
      this.frameAllocator,
    );
  }

  private reuseStaticEntryIfPossible(
    entry: SpriteRenderRecordCacheEntry,
    entityId: EntityId,
    sprite: Sprite,
    worldTransform: NonNullable<ReturnType<typeof getWorldTransform2D>>,
    isAnimatedSprite: boolean,
  ): boolean {
    if (isAnimatedSprite) {
      return false;
    }

    if (sprite.isDynamic) {
      return false;
    }

    if (entry.cohort !== "static") {
      return false;
    }

    if (this.cache.shouldRevalidateStatic(entityId)) {
      return false;
    }

    if (hasTransformChanged(entry.record.worldTransform, worldTransform)) {
      return false;
    }

    if (entry.lastCullingSignature !== this.cullingSignature) {
      entry.record.isVisible = isSpriteWithinCullingBounds(
        this.cullingBounds,
        entry.record.worldTransform,
        this.alpha,
        entry.record,
      );
      entry.lastCullingSignature = this.cullingSignature;
    }

    if (!entry.record.isVisible) {
      return true;
    }

    const spriteRecordIndex = pushSpriteRecord(this.spriteRecords, entry.record);
    queueSpriteCommand(
      entityId,
      this.world,
      sprite.assetId,
      sprite.layer,
      sprite.zOrder,
      spriteRecordIndex,
      this.renderQueue,
      this.frameAllocator,
    );

    return true;
  }

  private resolveEntryCohort(
    record: SpriteRenderRecord,
    sprite: Sprite,
    isAnimatedSprite: boolean,
  ): "static" | "dynamic" {
    if (isAnimatedSprite) {
      return "dynamic";
    }

    if (sprite.isDynamic) {
      return "dynamic";
    }

    if (record.dirtyMask !== SPRITE_RENDER_DIRTY_NONE) {
      return "dynamic";
    }

    return "static";
  }
}

function hasTransformChanged(previous: SpriteRenderRecord["worldTransform"], current: SpriteRenderRecord["worldTransform"]): boolean {
  return previous.curr.pos.x !== current.curr.pos.x
    || previous.curr.pos.y !== current.curr.pos.y
    || previous.curr.rotation !== current.curr.rotation
    || previous.curr.scale.x !== current.curr.scale.x
    || previous.curr.scale.y !== current.curr.scale.y
    || previous.prev.pos.x !== current.prev.pos.x
    || previous.prev.pos.y !== current.prev.pos.y
    || previous.prev.rotation !== current.prev.rotation
    || previous.prev.scale.x !== current.prev.scale.x
    || previous.prev.scale.y !== current.prev.scale.y;
}