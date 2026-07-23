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

/**
 * Opaque entity identity.
 *
 * IDs are monotonically allocated positive safe integers. They are never reused within an allocator,
 * so a stale reference cannot alias an entity created later in the same scene.
 */
export type EntityId<TComponents = unknown> = Tagged<number, 'EntityId', TComponents>;

const MAX_ENTITY_ID = Number.MAX_SAFE_INTEGER - 1;

/**
 * Returns whether a value is a valid entity ID.
 */
export function isEntityId(value: unknown): value is EntityId {
  return typeof value === 'number'
    && Number.isSafeInteger(value)
    && value > 0
    && value <= MAX_ENTITY_ID;
}

function isNextEntityId(value: unknown): value is number {
  return typeof value === 'number'
    && Number.isSafeInteger(value)
    && value > 0
    && value <= Number.MAX_SAFE_INTEGER;
}

/**
 * Monotonic allocator shared by every world in a scene.
 *
 * Destroyed IDs are deliberately not reused so stale references cannot alias newly created entities.
 */
export class EntityIdAllocator {
  #nextEntityId: number;

  constructor(nextEntityId: number = 1) {
    if (!isNextEntityId(nextEntityId)) {
      throw new Error(`Invalid next entity ID: ${nextEntityId}`);
    }

    this.#nextEntityId = nextEntityId;
  }

  get nextEntityId(): number {
    return this.#nextEntityId;
  }

  create(): EntityId {
    const entityId = this.#nextEntityId;
    if (!isEntityId(entityId)) {
      throw new Error('Entity ID capacity exhausted');
    }

    const nextEntityId = entityId + 1;
    if (!isNextEntityId(nextEntityId)) {
      throw new Error('Entity ID capacity exhausted');
    }

    this.#nextEntityId = nextEntityId;
    return entityId;
  }

  advanceTo(nextEntityId: number): void {
    if (!isNextEntityId(nextEntityId)) {
      throw new Error(`Invalid next entity ID: ${nextEntityId}`);
    }

    if (this.#nextEntityId < nextEntityId) {
      this.#nextEntityId = nextEntityId;
    }
  }

}
