// packages/engine/src/ecs/entity.ts
import type { Class, Tagged } from 'type-fest';

export type QueryComponentType = Class<unknown>;

type QueryComponentInstance<TComponentType extends QueryComponentType> =
  TComponentType extends Class<infer TComponent> ? TComponent : never;

type UnionToIntersection<TUnion> = (
  TUnion extends unknown ? (value: TUnion) => void : never
) extends (value: infer TIntersection) => void
  ? TIntersection
  : never;

type IsUnknown<T> = unknown extends T
  ? [keyof T] extends [never]
    ? true
    : false
  : false;

/**
 * Query metadata is represented as an intersection of queried component instances.
 * This keeps ids from multi-component queries assignable to narrower entity-id
 * views like `EntityId<A>` while `world.get(entityId, A)` still narrows via
 * `Extract<>`.
 */
export type QueryComponentMetadata<TComponentTypes extends readonly QueryComponentType[]> =
  TComponentTypes extends readonly []
    ? unknown
    : UnionToIntersection<QueryComponentInstance<TComponentTypes[number]>>;

export type EntityIdHasComponent<TEntityComponents, TComponent> =
  IsUnknown<TEntityComponents> extends true
    ? false
    : [Extract<TEntityComponents, TComponent>] extends [never]
      ? false
      : true;

export type EntityComponentLookupResult<TEntityComponents, TComponent> =
  EntityIdHasComponent<TEntityComponents, TComponent> extends true
    ? TComponent
    : TComponent | undefined;

export type QueryEntityId<TComponentTypes extends readonly QueryComponentType[]> =
  EntityId<QueryComponentMetadata<TComponentTypes>>;

export type QueryResult<TComponentTypes extends readonly QueryComponentType[]> =
  QueryEntityId<TComponentTypes>[];

export type InvariantQueryResult<TComponentTypes extends readonly QueryComponentType[]> = [
  QueryEntityId<TComponentTypes>,
  ...QueryEntityId<TComponentTypes>[],
];

// Opaque entity ID with embedded index (lower 20 bits) and generation (upper 12 bits)
export type EntityId<TComponents = unknown> = Tagged<number, 'EntityId', TComponents>;

const INDEX_BITS = 20;
const GENERATION_BITS = 12;
const MAX_ENTITIES = 1 << INDEX_BITS; // 2^20 = 1,048,576 entities
const GENERATION_MASK = (1 << GENERATION_BITS) - 1;
const INDEX_MASK = (1 << INDEX_BITS) - 1;

let nextIndex = 1;
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
