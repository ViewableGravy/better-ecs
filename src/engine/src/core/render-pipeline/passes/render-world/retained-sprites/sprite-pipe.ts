import {
    AnimatedSprite,
    EditorHoverHighlight,
    resolveEntityTint,
    Sprite,
    WorldTransform2D,
    type Transform2D,
} from "@engine/components";
import { getFrameAssetIdAtTime } from "@engine/components/sprite/animated";
import { Rgba } from "@engine/components/sprite/sprite";
import type { EntityId } from "@engine/ecs/entity";
import type { UserWorld, WorldMutationObserver } from "@engine/ecs/world";
import type { RenderCommand, RenderQueue } from "@engine/render/queue/render-queue";
import type { SpriteRenderState } from "@engine/render/types/renderer";

export interface SpritePipeRenderer {
  upsertRetainedSprite(
    bucketId: number,
    instanceId: EntityId,
    sprite: SpriteRenderState,
    transform: Transform2D,
  ): boolean;
  removeRetainedSprite(bucketId: number, instanceId: EntityId): void;
  releaseRetainedSpriteBucket(bucketId: number): void;
}

type RetainedSpriteEntry = {
  bucketId: number | null;
  animatedAssetId: string | null;
};

type RetainedSpriteBucket = {
  readonly id: number;
  readonly key: string;
  readonly command: RenderCommand;
  instanceCount: number;
};

type RetainedSpriteWorldState = {
  readonly dirtyEntityIds: Set<EntityId>;
  readonly animatedEntityIds: Set<EntityId>;
  readonly retryEntityIds: EntityId[];
  readonly entries: Map<EntityId, RetainedSpriteEntry>;
  readonly bucketsByKey: Map<string, RetainedSpriteBucket>;
  readonly bucketsById: Map<number, RetainedSpriteBucket>;
  initialized: boolean;
};

const SHARED_TINT = new Rgba();
const HOVER_TINT = new Rgba(1, 1, 0, 1);
const SHARED_SPRITE_STATE: SpriteRenderState = {
  assetId: "",
  width: 0,
  height: 0,
  anchorX: 0.5,
  anchorY: 0.5,
  flipX: false,
  flipY: false,
  layer: 0,
  zOrder: 0,
  tint: SHARED_TINT,
};

/**
 * Engine-owned retained projection of ECS sprites.
 *
 * Worlds are scanned once when first rendered. Subsequent work is driven by
 * entity dirtiness notifications plus animated frame sampling.
 */
export class SpritePipe implements WorldMutationObserver {
  readonly #states = new WeakMap<UserWorld, RetainedSpriteWorldState>();
  #nextBucketId = 1;

  constructor(
    private renderer: SpritePipeRenderer
  ) {}

  syncAndQueue(
    world: UserWorld,
    queue: RenderQueue,
    sampledTimeMs: number,
    sampledUpdateTick: number,
  ): void {
    const state = this.#resolveState(world);
    this.#initializeWorld(world, state);

    // Sample animated sprites and mark any that have changed as dirty
    for (const entityId of state.animatedEntityIds) {
      const entry = state.entries.get(entityId);
      const animatedSprite = world.get(entityId, AnimatedSprite);
      if (!entry || !animatedSprite) {
        state.dirtyEntityIds.add(entityId);
        continue;
      }

      const assetId = getFrameAssetIdAtTime(animatedSprite, sampledTimeMs, sampledUpdateTick);
      if (entry.animatedAssetId !== assetId) {
        state.dirtyEntityIds.add(entityId);
      }
    }

    // Sync dirty entities and retry any that failed to sync
    const retryEntityIds = state.retryEntityIds;
    retryEntityIds.length = 0;
    for (const entityId of state.dirtyEntityIds) {
      if (!this.#syncEntity(world, state, entityId, sampledTimeMs, sampledUpdateTick)) {
        retryEntityIds.push(entityId);
      }
    }

    // Clear the dirty set and re-add any that failed to sync so they will be retried next frame
    state.dirtyEntityIds.clear();
    for (const entityId of retryEntityIds) {
      state.dirtyEntityIds.add(entityId);
    }

    // Queue all non-empty retained sprite buckets for rendering
    for (const bucket of state.bucketsById.values()) {
      if (bucket.instanceCount > 0) {
        queue.add(bucket.command);
      }
    }
  }

  entityChanged(world: UserWorld, entityId: EntityId): void {
    const state = this.#states.get(world);
    if (!state) {
      return;
    }

    state.dirtyEntityIds.add(entityId);
  }

  worldReset(world: UserWorld): void {
    const state = this.#states.get(world);
    if (!state) {
      return;
    }

    this.#releaseState(state);
    state.initialized = false;
  }

  #resolveState(world: UserWorld): RetainedSpriteWorldState {
    const existing = this.#states.get(world);
    if (existing) {
      return existing;
    }

    const created: RetainedSpriteWorldState = {
      dirtyEntityIds: new Set(),
      animatedEntityIds: new Set(),
      retryEntityIds: [],
      entries: new Map(),
      bucketsByKey: new Map(),
      bucketsById: new Map(),
      initialized: false,
    };
    world.observeMutations(this);
    this.#states.set(world, created);
    return created;
  }

  #initializeWorld(world: UserWorld, state: RetainedSpriteWorldState): void {
    if (state.initialized) {
      return;
    }

    world.forEach(Sprite, (entityId) => state.dirtyEntityIds.add(entityId));
    world.forEach(AnimatedSprite, (entityId) => state.dirtyEntityIds.add(entityId));
    state.initialized = true;
  }

  #syncEntity(
    world: UserWorld,
    state: RetainedSpriteWorldState,
    entityId: EntityId,
    sampledTimeMs: number,
    sampledUpdateTick: number,
  ): boolean {
    const sprite = world.get(entityId, Sprite);
    const animatedSprite = sprite ? undefined : world.get(entityId, AnimatedSprite);
    const worldTransform = world.get(entityId, WorldTransform2D);
    const projectedSprite = sprite ?? animatedSprite;
    if (!projectedSprite || !worldTransform) {
      this.#removeEntry(state, entityId);
      return true;
    }

    const assetId = animatedSprite
      ? getFrameAssetIdAtTime(animatedSprite, sampledTimeMs, sampledUpdateTick)
      : projectedSprite.assetId;
    const tint = resolveEntityTint(world, entityId, SHARED_TINT);
    const hover = world.get(entityId, EditorHoverHighlight);
    if (hover) {
      tint.r += (HOVER_TINT.r - tint.r) * hover.amount;
      tint.g += (HOVER_TINT.g - tint.g) * hover.amount;
      tint.b += (HOVER_TINT.b - tint.b) * hover.amount;
    }

    let entry = state.entries.get(entityId);
    if (!entry) {
      entry = {
        bucketId: null,
        animatedAssetId: null,
      };
      state.entries.set(entityId, entry);
    }
    entry.animatedAssetId = animatedSprite ? assetId : null;
    if (animatedSprite) {
      state.animatedEntityIds.add(entityId);
    } else {
      state.animatedEntityIds.delete(entityId);
    }

    SHARED_SPRITE_STATE.assetId = assetId;
    SHARED_SPRITE_STATE.width = projectedSprite.width;
    SHARED_SPRITE_STATE.height = projectedSprite.height;
    SHARED_SPRITE_STATE.anchorX = projectedSprite.anchorX;
    SHARED_SPRITE_STATE.anchorY = projectedSprite.anchorY;
    SHARED_SPRITE_STATE.flipX = projectedSprite.flipX;
    SHARED_SPRITE_STATE.flipY = projectedSprite.flipY;
    SHARED_SPRITE_STATE.layer = projectedSprite.layer;
    SHARED_SPRITE_STATE.zOrder = projectedSprite.zOrder;
    const bucketKey = `${projectedSprite.layer}:${projectedSprite.zOrder}:${assetId}:${projectedSprite.isDynamic}`;
    const bucket = this.#resolveBucket(state, bucketKey, projectedSprite.layer, projectedSprite.zOrder, assetId);

    if (entry.bucketId !== bucket.id) {
      if (entry.bucketId !== null) {
        this.#removeEntryFromBucket(state, entry.bucketId, entityId);
      }
      entry.bucketId = bucket.id;
      bucket.instanceCount += 1;
    }

    return this.renderer.upsertRetainedSprite(
      bucket.id,
      entityId,
      SHARED_SPRITE_STATE,
      worldTransform,
    );
  }

  #resolveBucket(
    state: RetainedSpriteWorldState,
    key: string,
    layer: number,
    zOrder: number,
    assetId: string,
  ): RetainedSpriteBucket {
    const existing = state.bucketsByKey.get(key);
    if (existing) {
      return existing;
    }

    const id = this.#nextBucketId;
    this.#nextBucketId += 1;
    const created: RetainedSpriteBucket = {
      id,
      key,
      instanceCount: 0,
      command: {
        type: "retained-sprite-bucket",
        world: null,
        entityId: null,
        shape: null,
        scope: "gameplay",
        bucketKind: "sprite",
        bucketKey: `sprite:${assetId}`,
        layer,
        zOrder,
        retainedSpriteBucketId: id,
      },
    };
    state.bucketsByKey.set(key, created);
    state.bucketsById.set(id, created);
    return created;
  }

  #removeEntry(state: RetainedSpriteWorldState, entityId: EntityId): void {
    const entry = state.entries.get(entityId);
    if (!entry) {
      return;
    }

    if (entry.bucketId !== null) {
      this.#removeEntryFromBucket(state, entry.bucketId, entityId);
    }
    state.entries.delete(entityId);
    state.animatedEntityIds.delete(entityId);
  }

  #removeEntryFromBucket(
    state: RetainedSpriteWorldState,
    bucketId: number,
    instanceId: EntityId,
  ): void {
    const bucket = state.bucketsById.get(bucketId);
    if (!bucket) {
      return;
    }

    this.renderer.removeRetainedSprite(bucketId, instanceId);
    bucket.instanceCount -= 1;
    if (bucket.instanceCount > 0) {
      return;
    }

    this.renderer.releaseRetainedSpriteBucket(bucketId);
    state.bucketsById.delete(bucketId);
    state.bucketsByKey.delete(bucket.key);
  }

  #releaseState(state: RetainedSpriteWorldState): void {
    for (const bucket of state.bucketsById.values()) {
      this.renderer.releaseRetainedSpriteBucket(bucket.id);
    }
    state.dirtyEntityIds.clear();
    state.animatedEntityIds.clear();
    state.retryEntityIds.length = 0;
    state.entries.clear();
    state.bucketsByKey.clear();
    state.bucketsById.clear();
  }
}
