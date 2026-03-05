import { createSpriteRenderRecord, type SpriteRenderRecord } from "@engine/core/render-pipeline/passes/render-world/sprite-render-record";
import type { EntityId } from "@engine/ecs/entity";
import type { UserWorld } from "@engine/ecs/world";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/
export type SpriteQueueCohort = "unknown" | "static" | "dynamic";

type CachedSpriteRenderRecord = {
  record: SpriteRenderRecord;
  lastSeenSerial: number;
  cohort: SpriteQueueCohort;
  lastCullingSignature: number;
};

type WorldSpriteRenderRecordState = {
  records: Map<EntityId, CachedSpriteRenderRecord>;
  pruneCursor: Iterator<[EntityId, CachedSpriteRenderRecord]> | null;
  pruneBatchSize: number;
};

export type SpriteRenderRecordWorldState = WorldSpriteRenderRecordState;
export type SpriteRenderRecordCacheEntry = CachedSpriteRenderRecord;

/**********************************************************************************************************
 *   CONSTS
 **********************************************************************************************************/
const MIN_PRUNE_BATCH_SIZE = 64;
const MAX_PRUNE_BATCH_SIZE = 4096;
const STATIC_REVALIDATE_PERIOD = 180;

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/
export class SpriteRenderRecordCache {
  static #instance: SpriteRenderRecordCache | null = null;

  #serial = 0;
  #worldStates = new WeakMap<UserWorld, WorldSpriteRenderRecordState>();

  public static instance(): SpriteRenderRecordCache {
    if (!SpriteRenderRecordCache.#instance) {
      SpriteRenderRecordCache.#instance = new SpriteRenderRecordCache();
    }

    return SpriteRenderRecordCache.#instance;
  }

  private constructor() {
    return;
  }

  public beginFrame(): number {
    this.#serial += 1;
    return this.#serial;
  }

  public get currentSerial(): number {
    return this.#serial;
  }

  public resolveRecord(world: UserWorld, entityId: EntityId): SpriteRenderRecord {
    const state = this.#resolveWorldState(world);
    return this.resolveRecordFromState(state, entityId);
  }

  public resolveWorldState(world: UserWorld): SpriteRenderRecordWorldState {
    return this.#resolveWorldState(world);
  }

  public resolveRecordFromState(
    state: SpriteRenderRecordWorldState,
    entityId: EntityId,
  ): SpriteRenderRecord {
    return this.resolveEntryFromState(state, entityId).record;
  }

  public resolveEntryFromState(
    state: SpriteRenderRecordWorldState,
    entityId: EntityId,
  ): SpriteRenderRecordCacheEntry {
    const existing = state.records.get(entityId);
    if (existing) {
      existing.lastSeenSerial = this.#serial;
      return existing;
    }

    const entry: CachedSpriteRenderRecord = {
      record: createSpriteRenderRecord(),
      lastSeenSerial: this.#serial,
      cohort: "unknown",
      lastCullingSignature: Number.NaN,
    };

    state.records.set(entityId, entry);
    return entry;
  }

  public shouldRevalidateStatic(entityId: EntityId): boolean {
    return (this.#serial + Number(entityId)) % STATIC_REVALIDATE_PERIOD === 0;
  }

  public pruneBatch(world: UserWorld): void {
    const state = this.#resolveWorldState(world);
    this.pruneBatchFromState(state);
  }

  public pruneBatchFromState(state: SpriteRenderRecordWorldState): void {

    if (!state.pruneCursor) {
      state.pruneCursor = state.records.entries();
    }

    let scannedCount = 0;
    let prunedCount = 0;
    const targetBatchSize = state.pruneBatchSize;

    while (scannedCount < targetBatchSize && state.pruneCursor) {
      const next = state.pruneCursor.next();
      if (next.done) {
        state.pruneCursor = null;
        break;
      }

      scannedCount += 1;

      const [entityId, cachedRecord] = next.value;
      if (cachedRecord.lastSeenSerial === this.#serial) {
        continue;
      }

      state.records.delete(entityId);
      prunedCount += 1;
    }

    if (scannedCount === targetBatchSize && prunedCount === scannedCount) {
      state.pruneBatchSize = Math.min(MAX_PRUNE_BATCH_SIZE, targetBatchSize * 2);
      return;
    }

    if (prunedCount === 0 && targetBatchSize > MIN_PRUNE_BATCH_SIZE) {
      state.pruneBatchSize = Math.max(MIN_PRUNE_BATCH_SIZE, Math.floor(targetBatchSize / 2));
    }
  }

  #resolveWorldState(world: UserWorld): WorldSpriteRenderRecordState {
    const existing = this.#worldStates.get(world);
    if (existing) {
      return existing;
    }

    const created: WorldSpriteRenderRecordState = {
      records: new Map<EntityId, CachedSpriteRenderRecord>(),
      pruneCursor: null,
      pruneBatchSize: MIN_PRUNE_BATCH_SIZE,
    };

    this.#worldStates.set(world, created);
    return created;
  }
}