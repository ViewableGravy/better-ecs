import type {
  EntityComponentLookupResult,
  EntityId,
  InvariantQueryResult,
  QueryResult,
} from "@engine/ecs/entity";
import { QueryCursor2 } from "@engine/ecs/query-cursor";
import { World } from "@engine/ecs/world/world";
import type { Class } from "type-fest";

type ForEach1Callback<TA> = (entityId: EntityId<TA>, componentA: TA) => void;
type ForEach2Callback<TA, TB> = (entityId: EntityId<TA & TB>, componentA: TA, componentB: TB) => void;
type ForEach3Callback<TA, TB, TC> = (
  entityId: EntityId<TA & TB & TC>,
  componentA: TA,
  componentB: TB,
  componentC: TC,
) => void;
type PatchCallback<T> = (component: T) => void;
export interface WorldMutationObserver {
  entityChanged?(world: UserWorld, entityId: EntityId): void;
  componentChanged?(
    world: UserWorld,
    entityId: EntityId,
    componentType: Function,
    kind: ComponentMutationKind,
    component: unknown,
  ): void;
  worldReset?(world: UserWorld): void;
}

export type ComponentMutationKind = "added" | "patched" | "removed";

export interface IUserWorld {
  create(): EntityId;

  destroy(...componentTypes: Function[]): void;
  destroy(entityId: EntityId): void;

  add<T>(entityId: EntityId, componentType: Class<T>, component: T): void;
  add<T>(entityId: EntityId, component: T): void;
  get<T, TEntityComponents>(entityId: EntityId<TEntityComponents>, componentType: Class<T>): EntityComponentLookupResult<TEntityComponents, T>;
  require<T>(entityId: EntityId, componentType: Class<T>): T;
  patch<T>(entityId: EntityId, componentType: Class<T>, callback: PatchCallback<T>): T;
  tryPatch<T>(entityId: EntityId, componentType: Class<T>, callback: PatchCallback<T>): T | undefined;

  all(): EntityId[];
  getComponentCount(componentType: Function): number;
  getComponentEntityIds(componentType: Function): readonly EntityId[];
  getComponentTypes(entityId: EntityId): Function[];
  has<T>(entityId: EntityId<T>, componentType: Class<T>): boolean;
  remove<T>(entityId: EntityId<T>, componentType: Class<T>): void;
  move(entityId: EntityId, world: UserWorld): void;
  setParent(childEntityId: EntityId, parentEntityId: EntityId): void;
  removeParent(childEntityId: EntityId): void;
  getChildren(parentEntityId: EntityId): ReadonlySet<EntityId> | undefined;

  query<const TComponentTypes extends readonly Class<unknown>[]>(
    ...componentTypes: TComponentTypes
  ): QueryResult<TComponentTypes>;

  /** Creates a two-component query cursor that can be reused across `for...of` traversals. */
  createQueryCursor<TA, TB>(
    componentTypeA: Class<TA>,
    componentTypeB: Class<TB>,
  ): QueryCursor2<TA, TB>;

  /**
   * Traverses matching entities without allocating result rows.
   * Structural world mutation throws until the traversal completes.
   */
  forEach<TA>(
    componentTypeA: Class<TA>,
    callback: ForEach1Callback<TA>,
  ): void;
  forEach<TA, TB>(
    componentTypeA: Class<TA>,
    componentTypeB: Class<TB>,
    callback: ForEach2Callback<TA, TB>,
  ): void;
  forEach<TA, TB, TC>(
    componentTypeA: Class<TA>,
    componentTypeB: Class<TB>,
    componentTypeC: Class<TC>,
    callback: ForEach3Callback<TA, TB, TC>,
  ): void;

}

export class UserWorld implements IUserWorld {
  readonly #mutationObservers = new Set<WorldMutationObserver>();
  #unsubscribeFromWorld: (() => void) | null = null;

  constructor(private world: World) {}

  /** @internal Update the wrapped world without reallocating the wrapper. */
  setWorld(world: World): void {
    this.#unsubscribeFromWorld?.();
    this.#unsubscribeFromWorld = null;
    this.world = world;
    if (this.#mutationObservers.size > 0) {
      this.#subscribeToWorld();
    }

    for (const observer of this.#mutationObservers) {
      observer.worldReset?.(this);
    }
  }

  /** @internal Observe entity dirtiness and world resets without exposing renderer state to the ECS. */
  observeMutations(observer: WorldMutationObserver): () => void {
    this.#mutationObservers.add(observer);
    if (!this.#unsubscribeFromWorld) {
      this.#subscribeToWorld();
    }

    return () => {
      this.#mutationObservers.delete(observer);
      if (this.#mutationObservers.size > 0) {
        return;
      }

      this.#unsubscribeFromWorld?.();
      this.#unsubscribeFromWorld = null;
    };
  }

  /** @internal Publish a derived component update from an engine-owned synchronization boundary. */
  notifyEntityChanged(entityId: EntityId): void {
    this.world.notifyEntityChanged(entityId);
  }

  create(): EntityId {
    return this.world.createEntity();
  }

  destroy(...componentTypes: Function[]): void;
  destroy(entityId: EntityId): void;
  destroy(arg: EntityId | Function, ...componentTypes: Function[]): void {
    if (typeof arg === "number") {
      this.world.destroyEntity(arg);
    } else {
      const entities = this.world.query(arg as Class<unknown>, ...(componentTypes as Class<unknown>[]));
      for (const entityId of entities) {
        this.world.destroyEntity(entityId);
      }
    }
  }

  add<T>(entityId: EntityId, componentType: Class<T>, component: T): void;
  add<T>(entityId: EntityId, component: T): void;
  add<T>(entityId: EntityId, componentTypeOrComponent: Class<T> | T, component?: T): void {
    this.world.addComponent(entityId, componentTypeOrComponent as any, component as any);
  }

  get<T, TEntityComponents>(entityId: EntityId<TEntityComponents>, componentType: Class<T>): EntityComponentLookupResult<TEntityComponents, T>;
  get<T>(entityId: EntityId<T>, componentType: Class<T>): T | undefined {
    return this.world.getComponent<T>(entityId, componentType);
  }

  /**
   * Gets a component from an entity, throwing an error if it doesn't exist. This should only be used if we have
   * not already asserted that the component exists at a type level using something like world.query or world.has, otherwise
   * we can use get as this will have the necessary type information to perform a type level assertion without the unnecessary
   * runtime overhead.
   * 
   * @throws {Error} If the component does not exist on the entity
   */
  require<T>(entityId: EntityId, componentType: Class<T>): T {
    // Cast entityId as we have not asserted prior to this point that the entity has the component, the the generic
    // does not match yet. This function effectively does that if we have not already used `has`.
    // If we have used `has` then we can use `get` instead
    const component = this.world.getComponent<T>(entityId as EntityId<T>, componentType);
    if (component === undefined) {
      throw new Error(
        `Component ${componentType.name} does not exist on entity ${entityId}`,
      );
    }
    return component;
  }

  /**
   * Mutates an existing component and publishes one component-level change after the callback completes.
   * Direct writes through get/require remain deliberately untracked.
   */
  patch<T>(entityId: EntityId, componentType: Class<T>, callback: PatchCallback<T>): T {
    return this.world.patchComponent(entityId, componentType, callback);
  }

  /** Mutates a component when present, returning undefined without publishing when it is absent. */
  tryPatch<T>(entityId: EntityId, componentType: Class<T>, callback: PatchCallback<T>): T | undefined {
    return this.world.tryPatchComponent(entityId, componentType, callback);
  }

  all(): EntityId[] {
    return this.world.getEntities();
  }

  /** @internal Returns a component store's entity count without allocating a query result. */
  getComponentCount(componentType: Function): number {
    return this.world.getComponentCount(componentType);
  }

  /** @internal Returns a component store's stable dense entity view without allocating. */
  getComponentEntityIds(componentType: Function): readonly EntityId[] {
    return this.world.getComponentEntityIds(componentType);
  }

  getComponentTypes(entityId: EntityId): Function[] {
    return this.world.getComponentTypes(entityId);
  }

  has<T>(entityId: EntityId, componentType: Class<T>): entityId is EntityId<T> {
    return this.world.hasComponent(entityId, componentType);
  }

  remove(entityId: EntityId, componentType: Class<any>): void {
    this.world.removeComponent(entityId, componentType);
  }

  move(entityId: EntityId, world: UserWorld): void {
    this.world.moveEntityTo(entityId, world.world);
  }

  /** Attaches or reparents an entity while preserving hierarchy invariants and cached adjacency. */
  setParent(childEntityId: EntityId, parentEntityId: EntityId): void {
    this.world.setParent(childEntityId, parentEntityId);
  }

  /** Detaches an entity from its parent. */
  removeParent(childEntityId: EntityId): void {
    this.world.removeParent(childEntityId);
  }

  /** @internal Returns the cached children of a parent without allocating. */
  getChildren(parentEntityId: EntityId): ReadonlySet<EntityId> | undefined {
    return this.world.getChildren(parentEntityId);
  }

  query<const TComponentTypes extends readonly Class<unknown>[]>(
    ...componentTypes: TComponentTypes
  ): QueryResult<TComponentTypes> {
    return this.world.query(...componentTypes);
  }

  createQueryCursor<TA, TB>(
    componentTypeA: Class<TA>,
    componentTypeB: Class<TB>,
  ): QueryCursor2<TA, TB> {
    return new QueryCursor2(this.world, componentTypeA, componentTypeB);
  }

  forEach<TA>(
    componentTypeA: Class<TA>,
    callback: ForEach1Callback<TA>,
  ): void;
  forEach<TA, TB>(
    componentTypeA: Class<TA>,
    componentTypeB: Class<TB>,
    callback: ForEach2Callback<TA, TB>,
  ): void;
  forEach<TA, TB, TC>(
    componentTypeA: Class<TA>,
    componentTypeB: Class<TB>,
    componentTypeC: Class<TC>,
    callback: ForEach3Callback<TA, TB, TC>,
  ): void;
  forEach(
    componentTypeA: Function,
    componentTypeBOrCallback: Function,
    componentTypeCOrCallback?: Function,
    maybeCallback?: Function,
  ): void {
    if (typeof maybeCallback === "function" && componentTypeCOrCallback) {
      this.world.forEach3(
        componentTypeA as Class<unknown>,
        componentTypeBOrCallback as Class<unknown>,
        componentTypeCOrCallback as Class<unknown>,
        maybeCallback as ForEach3Callback<unknown, unknown, unknown>,
      );
      return;
    }

    if (typeof componentTypeCOrCallback === "function") {
      this.world.forEach2(
        componentTypeA as Class<unknown>,
        componentTypeBOrCallback as Class<unknown>,
        componentTypeCOrCallback as ForEach2Callback<unknown, unknown>,
      );
      return;
    }

    this.world.forEach1(
      componentTypeA as Class<unknown>,
      componentTypeBOrCallback as ForEach1Callback<unknown>,
    );
  }

  invariantQuery<const TComponentTypes extends readonly Class<unknown>[]>(
    ...componentTypes: TComponentTypes
  ): InvariantQueryResult<TComponentTypes> {
    const results = this.world.query(...componentTypes);
    if (results.length === 0) {
      throw new Error(
        `Invariant query for components [${componentTypes.map((t) => t.name).join(", ")}] returned no results`,
      );
    }
    // Query metadata is compile-time only, so the runtime array can be reused as-is.
    return results as InvariantQueryResult<TComponentTypes>;
  }

  #subscribeToWorld(): void {
    this.#unsubscribeFromWorld = this.world.observeMutations({
      entityChanged: (_, entityId) => {
        for (const observer of this.#mutationObservers) {
          observer.entityChanged?.(this, entityId);
        }
      },
      componentChanged: (_, entityId, componentType, kind, component) => {
        for (const observer of this.#mutationObservers) {
          if (observer.componentChanged) {
            observer.componentChanged(this, entityId, componentType, kind, component);
            continue;
          }

          observer.entityChanged?.(this, entityId);
        }
      },
      worldReset: () => {
        for (const observer of this.#mutationObservers) {
          observer.worldReset?.(this);
        }
      },
    });
  }
}
