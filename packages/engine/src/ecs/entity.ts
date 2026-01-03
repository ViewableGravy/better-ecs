// packages/engine/src/ecs/entity.ts
import type { Tagged } from 'type-fest';

// Opaque entity ID with embedded index (lower 20 bits) and generation (upper 12 bits)
export type EntityId = Tagged<number, 'EntityId'>;

const INDEX_BITS = 20;
const GENERATION_BITS = 12;
const MAX_ENTITIES = 1 << INDEX_BITS; // 2^20 = 1,048,576 entities
const GENERATION_MASK = (1 << GENERATION_BITS) - 1;
const INDEX_MASK = (1 << INDEX_BITS) - 1;

let nextIndex = 0;
const generations = new Map<number, number>();

/**
 * Creates a new entity ID with initial generation 0
 */
export function createEntityId(): EntityId {
  if (nextIndex >= MAX_ENTITIES) {
    throw new Error('Maximum entity count reached');
  }
  
  const index = nextIndex++;
  generations.set(index, 0);
  return encodeEntityId(index, 0);
}

/**
 * Extracts the index from an entity ID
 */
export function getEntityIndex(id: EntityId): number {
  return id & INDEX_MASK;
}

/**
 * Extracts the generation from an entity ID
 */
export function getEntityGeneration(id: EntityId): number {
  return (id >> INDEX_BITS) & GENERATION_MASK;
}

/**
 * Encodes index and generation into an entity ID
 */
export function encodeEntityId(index: number, generation: number): EntityId {
  return ((generation & GENERATION_MASK) << INDEX_BITS | (index & INDEX_MASK)) as EntityId;
}

/**
 * Checks if an entity ID is alive (matches current generation)
 */
export function isEntityAlive(id: EntityId): boolean {
  const index = getEntityIndex(id);
  const generation = getEntityGeneration(id);
  return generations.get(index) === generation;
}

/**
 * Invalidates an entity by incrementing its generation
 */
export function invalidateEntity(id: EntityId): void {
  const index = getEntityIndex(id);
  const current = generations.get(index) ?? 0;
  generations.set(index, (current + 1) & GENERATION_MASK);
}
