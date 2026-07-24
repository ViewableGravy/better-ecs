import {
    AnimatedSprite,
    EditorHoverHighlight,
    Parent,
    resolveEntityTint,
    Sprite,
    Transform2D,
    WorldTransform2D,
} from "@engine/components";
import { getFrameAssetIdAtTime } from "@engine/components/sprite/animated";
import { Rgba } from "@engine/components/sprite/sprite";
import type { EntityId } from "@engine/ecs/entity";
import type {
  Registry,
  RegistryMutationObserver,
} from "@engine/ecs/registry";
import type { RenderCommand, RenderQueue } from "@engine/render/queue/render-queue";
import type { SpriteRenderState } from "@engine/render/types/renderer";
import invariant from "tiny-invariant";

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

type RetainedSpriteRegistryState = {
  readonly dirtyEntityIds: Set<EntityId>;
  readonly cpuAnimatedEntityIds: Set<EntityId>;
  readonly retryEntityIds: EntityId[];
  readonly entries: Map<EntityId, RetainedSpriteEntry>;
  readonly bucketsByKey: Map<string, RetainedSpriteBucket>;
  readonly bucketsById: Map<number, RetainedSpriteBucket>;
  initialized: boolean;
};

const SHARED_TINT = new Rgba();
const HOVER_TINT = new Rgba(1, 1, 0, 1);
const SHARED_ANIMATION_STATE = {
  frameAssetIds: [] as readonly string[],
  playbackRate: 0,
  startTick: 0,
};
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
  animation: undefined,
};

/**
 * Engine-owned retained projection of ECS sprites.
 *
 * Registries are scanned once when first rendered. Subsequent work is driven by
 * entity dirtiness notifications plus CPU-selected animated frame sampling.
 * Shader-selected animations remain retained and advance through one uniform per draw bucket.
 */
export class SpritePipe implements RegistryMutationObserver {
  readonly #states = new WeakMap<Registry, RetainedSpriteRegistryState>();
  #nextBucketId = 1;

  constructor(
    private renderer: SpritePipeRenderer
  ) {}

  syncAndQueue(
    registry: Registry,
    queue: RenderQueue,
    sampledTimeMs: number,
    sampledUpdateTick: number,
  ): void {
    const state = this.#resolveState(registry);
    this.#initializeRegistry(registry, state);

    // Sample animated sprites and mark any that have changed as dirty
    for (const entityId of state.cpuAnimatedEntityIds) {
      const entry = state.entries.get(entityId);
      const animatedSprite = registry.get(entityId, AnimatedSprite);
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
      if (!this.#syncEntity(registry, state, entityId, sampledTimeMs, sampledUpdateTick)) {
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

  entityChanged(registry: Registry, entityId: EntityId): void {
    const state = this.#states.get(registry);
    if (!state) {
      return;
    }

    state.dirtyEntityIds.add(entityId);
  }

  componentChanged(
    registry: Registry,
    entityId: EntityId,
    componentType: Function,
  ): void {
    if (componentType === Transform2D || componentType === Parent) {
      return;
    }

    this.entityChanged(registry, entityId);
  }

  registryReset(registry: Registry): void {
    const state = this.#states.get(registry);
    if (!state) {
      return;
    }

    this.#releaseState(state);
    state.initialized = false;
  }

  #resolveState(registry: Registry): RetainedSpriteRegistryState {
    const existing = this.#states.get(registry);
    if (existing) {
      return existing;
    }

    const created: RetainedSpriteRegistryState = {
      dirtyEntityIds: new Set(),
      cpuAnimatedEntityIds: new Set(),
      retryEntityIds: [],
      entries: new Map(),
      bucketsByKey: new Map(),
      bucketsById: new Map(),
      initialized: false,
    };
    registry.observeMutations(this);
    this.#states.set(registry, created);
    return created;
  }

  #initializeRegistry(registry: Registry, state: RetainedSpriteRegistryState): void {
    if (state.initialized) {
      return;
    }

    registry.forEach(Sprite, (entityId) => state.dirtyEntityIds.add(entityId));
    registry.forEach(AnimatedSprite, (entityId) => state.dirtyEntityIds.add(entityId));
    state.initialized = true;
  }

  #syncEntity(
    registry: Registry,
    state: RetainedSpriteRegistryState,
    entityId: EntityId,
    sampledTimeMs: number,
    sampledUpdateTick: number,
  ): boolean {
    const sprite = registry.get(entityId, Sprite);
    const animatedSprite = sprite ? undefined : registry.get(entityId, AnimatedSprite);
    const worldTransform = registry.get(entityId, WorldTransform2D);
    const projectedSprite = sprite ?? animatedSprite;
    if (!projectedSprite || !worldTransform) {
      this.#removeEntry(state, entityId);
      return true;
    }

    const usesShaderAnimation = animatedSprite?.frameSelectionMode === "shader";
    if (usesShaderAnimation) {
      invariant(animatedSprite.playbackMode === "tick", "Shader-selected sprite animation requires tick playback");
    }

    const assetId = usesShaderAnimation
      ? animatedSprite.frames[0]
      : animatedSprite
        ? getFrameAssetIdAtTime(animatedSprite, sampledTimeMs, sampledUpdateTick)
      : projectedSprite.assetId;
    const tint = resolveEntityTint(registry, entityId, SHARED_TINT);
    const hover = registry.get(entityId, EditorHoverHighlight);
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
    entry.animatedAssetId = animatedSprite && !usesShaderAnimation ? assetId : null;
    if (animatedSprite && !usesShaderAnimation) {
      state.cpuAnimatedEntityIds.add(entityId);
    } else {
      state.cpuAnimatedEntityIds.delete(entityId);
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
    if (usesShaderAnimation) {
      SHARED_ANIMATION_STATE.frameAssetIds = animatedSprite.frames;
      SHARED_ANIMATION_STATE.playbackRate = animatedSprite.playbackRate;
      SHARED_ANIMATION_STATE.startTick = animatedSprite.useGlobalOffset ? 0 : animatedSprite.startTick;
      SHARED_SPRITE_STATE.animation = SHARED_ANIMATION_STATE;
    } else {
      SHARED_SPRITE_STATE.animation = undefined;
    }

    const visualKey = usesShaderAnimation
      ? `animation:${animatedSprite.frames.join(",")}:${animatedSprite.playbackRate}:${SHARED_ANIMATION_STATE.startTick}`
      : `asset:${assetId}`;
    const bucketKey =
      `${projectedSprite.layer}:${projectedSprite.zOrder}:${visualKey}:${projectedSprite.isDynamic}`;
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
    state: RetainedSpriteRegistryState,
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
        registry: null,
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

  #removeEntry(state: RetainedSpriteRegistryState, entityId: EntityId): void {
    const entry = state.entries.get(entityId);
    if (!entry) {
      return;
    }

    if (entry.bucketId !== null) {
      this.#removeEntryFromBucket(state, entry.bucketId, entityId);
    }
    state.entries.delete(entityId);
    state.cpuAnimatedEntityIds.delete(entityId);
  }

  #removeEntryFromBucket(
    state: RetainedSpriteRegistryState,
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

  #releaseState(state: RetainedSpriteRegistryState): void {
    for (const bucket of state.bucketsById.values()) {
      this.renderer.releaseRetainedSpriteBucket(bucket.id);
    }
    state.dirtyEntityIds.clear();
    state.cpuAnimatedEntityIds.clear();
    state.retryEntityIds.length = 0;
    state.entries.clear();
    state.bucketsByKey.clear();
    state.bucketsById.clear();
  }
}
