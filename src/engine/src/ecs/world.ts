// packages/engine/src/ecs/world.ts
import { Parent } from "@engine/components";
import type {
  EntityComponentLookupResult,
  EntityId,
  InvariantQueryResult,
  QueryResult,
} from "@engine/ecs/entity";
import { createEntityId, getEntityIndex, invalidateEntity } from "@engine/ecs/entity";
import { ComponentStore } from "@engine/ecs/storage";
import type { Class } from "type-fest";

type ForEach1Callback<TA> = (entityId: EntityId<TA>, componentA: TA) => void;
type ForEach2Callback<TA, TB> = (entityId: EntityId<TA & TB>, componentA: TA, componentB: TB) => void;
type ForEach3Callback<TA, TB, TC> = (
  entityId: EntityId<TA & TB & TC>,
  componentA: TA,
  componentB: TB,
  componentC: TC,
) => void;

export interface IUserWorld {
  create(): EntityId;

  destroy(...componentTypes: Function[]): void;
  destroy(entityId: EntityId): void;

  add<T>(entityId: EntityId, componentType: Class<T>, component: T): void;
  add<T>(entityId: EntityId, component: T): void;
  get<T, TEntityComponents>(entityId: EntityId<TEntityComponents>, componentType: Class<T>): EntityComponentLookupResult<TEntityComponents, T>;
  require<T>(entityId: EntityId, componentType: Class<T>): T;

  all(): EntityId[];
  getComponentTypes(entityId: EntityId): Function[];
  has<T>(entityId: EntityId<T>, componentType: Class<T>): boolean;
  remove<T>(entityId: EntityId<T>, componentType: Class<T>): void;

  move(entityId: EntityId, world: UserWorld): void;

  query<const TComponentTypes extends readonly Class<unknown>[]>(
    ...componentTypes: TComponentTypes
  ): QueryResult<TComponentTypes>;

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

  forEach1<TA>(componentTypeA: Class<TA>, callback: ForEach1Callback<TA>): void;
  forEach2<TA, TB>(
    componentTypeA: Class<TA>,
    componentTypeB: Class<TB>,
    callback: ForEach2Callback<TA, TB>,
  ): void;
  forEach3<TA, TB, TC>(
    componentTypeA: Class<TA>,
    componentTypeB: Class<TB>,
    componentTypeC: Class<TC>,
    callback: ForEach3Callback<TA, TB, TC>,
  ): void;
}

export class UserWorld implements IUserWorld {
  constructor(private world: World) {}

  /** @internal Update the wrapped world without reallocating the wrapper. */
  setWorld(world: World): void {
    this.world = world;
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

  all(): EntityId[] {
    return this.world.getEntities();
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

  query<const TComponentTypes extends readonly Class<unknown>[]>(
    ...componentTypes: TComponentTypes
  ): QueryResult<TComponentTypes> {
    return this.world.query(...componentTypes);
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

  forEach1<TA>(componentTypeA: Class<TA>, callback: ForEach1Callback<TA>): void {
    this.world.forEach1(componentTypeA, callback);
  }

  forEach2<TA, TB>(
    componentTypeA: Class<TA>,
    componentTypeB: Class<TB>,
    callback: ForEach2Callback<TA, TB>,
  ): void {
    this.world.forEach2(componentTypeA, componentTypeB, callback);
  }

  forEach3<TA, TB, TC>(
    componentTypeA: Class<TA>,
    componentTypeB: Class<TB>,
    componentTypeC: Class<TC>,
    callback: ForEach3Callback<TA, TB, TC>,
  ): void {
    this.world.forEach3(componentTypeA, componentTypeB, componentTypeC, callback);
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
}

export class World {
  private entities = new Set<EntityId>();
  private componentStores = new Map<Function, ComponentStore<any>>();

  /** Optional scene identifier for debugging */
  public sceneId?: string;

  constructor(sceneId?: string) {
    this.sceneId = sceneId;
  }

  /**
   * Creates a new entity
   */
  createEntity(): EntityId {
    const entityId = createEntityId();
    this.entities.add(entityId);
    return entityId;
  }

  /**
   * Destroys an entity and removes all its components
   */
  destroyEntity(entityId: EntityId): void {
    if (!this.entities.has(entityId)) return;

    const descendants = this.collectDescendants(entityId);

    for (let i = descendants.length - 1; i >= 0; i -= 1) {
      this.destroyEntityShallow(descendants[i]);
    }

    this.destroyEntityShallow(entityId);
  }

  private destroyEntityShallow(entityId: EntityId): void {
    if (!this.entities.has(entityId)) return;

    // Remove from all component stores
    for (const store of this.componentStores.values()) {
      store.remove(entityId);
    }

    invalidateEntity(entityId);
    this.entities.delete(entityId);
  }

  private collectDescendants(entityId: EntityId): EntityId[] {
    const parentStore = this.componentStores.get(Parent) as ComponentStore<Parent> | undefined;
    if (!parentStore) {
      return [];
    }

    const childrenByParent = new Map<EntityId, EntityId[]>();

    for (const [childEntityId, parent] of parentStore) {
      if (!this.entities.has(childEntityId) || !this.entities.has(parent.entityId)) {
        continue;
      }

      const children = childrenByParent.get(parent.entityId);
      if (children) {
        children.push(childEntityId);
        continue;
      }

      childrenByParent.set(parent.entityId, [childEntityId]);
    }

    const descendants: EntityId[] = [];
    const stack: EntityId[] = [entityId];
    const visited = new Set<EntityId>();

    while (stack.length > 0) {
      const current = stack.pop();
      if (current === undefined) {
        continue;
      }

      const children = childrenByParent.get(current);
      if (!children) {
        continue;
      }

      for (const childEntityId of children) {
        if (visited.has(childEntityId)) {
          continue;
        }

        visited.add(childEntityId);
        descendants.push(childEntityId);
        stack.push(childEntityId);
      }
    }

    return descendants;
  }

  /**
   * Adds or replaces a component on an entity
   */
  addComponent<T>(entityId: EntityId<T>, componentType: Function, component: T): void;
  addComponent<T>(entityId: EntityId<T>, component: T): void;
  addComponent<T>(entityId: EntityId<T>, componentTypeOrComponent: Function | T, component?: T): void {
    if (!this.entities.has(entityId)) {
      throw new Error(`Entity ${entityId} does not exist`);
    }

    const componentType =
      component !== undefined
        ? (componentTypeOrComponent as Function)
        : (componentTypeOrComponent as any).constructor;
    const comp = component !== undefined ? component : (componentTypeOrComponent as T);

    let store = this.componentStores.get(componentType) as ComponentStore<T> | undefined;
    if (!store) {
      store = new ComponentStore<T>();
      this.componentStores.set(componentType, store);
    }

    store.add(entityId, comp);
  }

  /**
   * Gets a component from an entity
   */
  getComponent<T>(entityId: EntityId<T>, componentType: Function): T | undefined {
    const store = this.componentStores.get(componentType);
    if (!store) return undefined;
    return (store as ComponentStore<T>).get(entityId);
  }

  /**
   * Checks if an entity has a component
   */
  hasComponent<T>(entityId: EntityId<T>, componentType: Function): boolean {
    const store = this.componentStores.get(componentType);
    if (!store) return false;
    return store.has(entityId);
  }

  /**
   * Removes a component from an entity
   */
  removeComponent<T>(entityId: EntityId<T>, componentType: Function): void {
    const store = this.componentStores.get(componentType);
    if (store) {
      store.remove(entityId);
    }
  }

  /**
   * Moves an entity and all of its descendants to another world.
   */
  moveEntityTo(entityId: EntityId, targetWorld: World): void {
    if (this === targetWorld) {
      return;
    }

    if (!this.entities.has(entityId)) {
      throw new Error(`Entity ${entityId} does not exist`);
    }

    const descendants = this.collectDescendants(entityId);
    const entitiesToMove: EntityId[] = [entityId, ...descendants];

    for (const movingEntityId of entitiesToMove) {
      if (targetWorld.entities.has(movingEntityId)) {
        throw new Error(`Entity ${movingEntityId} already exists in target world`);
      }
    }

    for (const movingEntityId of entitiesToMove) {
      this.moveEntityShallowTo(movingEntityId, targetWorld);
    }
  }

  private moveEntityShallowTo(entityId: EntityId, targetWorld: World): void {
    if (!this.entities.has(entityId)) {
      throw new Error(`Entity ${entityId} does not exist`);
    }

    if (targetWorld.entities.has(entityId)) {
      throw new Error(`Entity ${entityId} already exists in target world`);
    }

    targetWorld.entities.add(entityId);

    for (const [componentType, sourceStore] of this.componentStores) {
      const component = sourceStore.get(entityId);
      if (component === undefined) {
        continue;
      }

      let targetStore = targetWorld.componentStores.get(componentType);
      if (!targetStore) {
        targetStore = new ComponentStore<unknown>();
        targetWorld.componentStores.set(componentType, targetStore);
      }

      targetStore.add(entityId, component);
      sourceStore.remove(entityId);
    }

    this.entities.delete(entityId);
  }

  /**
   * Queries entities by component types (intersection).
   *
   * Algorithm:
   * 1) Resolve stores for each requested component.
   * 2) Choose the smallest store as the base iteration set.
   * 3) For each entity in that base set, verify membership in every other store.
   *
   * Why this shape:
   * - Intersecting from the smallest store minimizes entities we need to test.
   * - Membership checks run by entity index (sparse-set key) to avoid extra map lookups.
   */
  query<const TComponentTypes extends readonly Class<unknown>[]>(
    ...componentTypes: TComponentTypes
  ): QueryResult<TComponentTypes> {
    // No filter means "all entities".
    if (componentTypes.length === 0) {
      // Query metadata is compile-time only, so the runtime array can be reused as-is.
      return this.getEntities() as QueryResult<TComponentTypes>;
    }

    // Resolve stores once and track the smallest store for base iteration.
    const stores: ComponentStore<unknown>[] = [];
    let smallestStore: ComponentStore<unknown> | undefined;
    let smallestCount = Infinity;

    for (const componentType of componentTypes) {
      const store = this.componentStores.get(componentType);

      if (!store) {
        return [] as QueryResult<TComponentTypes>; // No entities have all required components
      }

      stores.push(store);
      const storeCount = store.count();

      // Base iteration cost is proportional to this count, so pick the smallest.
      if (storeCount < smallestCount) {
        smallestStore = store;
        smallestCount = storeCount;
      }
    }

    if (!smallestStore) {
      return [] as QueryResult<TComponentTypes>;
    }

    // Fast path: single-component query is just the dense entity list for that store.
    if (stores.length === 1) {
      // Query metadata is compile-time only, so the runtime array can be reused as-is.
      return [...smallestStore.entityIds()] as QueryResult<TComponentTypes>;
    }

    // Build the remaining stores once so the inner loop only performs sparse membership checks.
    const otherStores: ComponentStore<unknown>[] = [];
    for (const store of stores) {
      if (store === smallestStore) {
        continue;
      }
      otherStores.push(store);
    }

    const result: EntityId[] = [];

    // Iterate dense entities from the smallest store, then verify presence in every other store.
    for (const entityId of smallestStore.entityIds()) {
      // Sparse sets are keyed by entity index, not full entity id.
      const entityIndex = getEntityIndex(entityId);
      let matchesAll = true;

      for (const store of otherStores) {
        if (!store.hasEntityIndex(entityIndex)) {
          matchesAll = false;
          break;
        }
      }

      if (matchesAll) {
        result.push(entityId);
      }
    }

    // Query metadata is compile-time only, so the runtime array can be reused as-is.
    return result as QueryResult<TComponentTypes>;
  }

  forEach1<TA>(componentTypeA: Class<TA>, callback: ForEach1Callback<TA>): void {
    const storeA = this.componentStores.get(componentTypeA) as ComponentStore<TA> | undefined;
    if (!storeA) {
      return;
    }

    const entities = storeA.entityIds();
    const components = storeA.components();

    for (let i = 0; i < entities.length; i += 1) {
      const entityId = entities[i];
      const componentA = components[i];

      if (entityId === undefined || componentA === undefined) {
        continue;
      }

      callback(entityId, componentA);
    }
  }

  forEach2<TA, TB>(
    componentTypeA: Class<TA>,
    componentTypeB: Class<TB>,
    callback: ForEach2Callback<TA, TB>,
  ): void {
    const storeA = this.componentStores.get(componentTypeA) as ComponentStore<TA> | undefined;
    const storeB = this.componentStores.get(componentTypeB) as ComponentStore<TB> | undefined;

    if (!storeA || !storeB) {
      return;
    }

    const iterateAFirst = storeA.count() <= storeB.count();

    if (iterateAFirst) {
      const entityIds = storeA.entityIds();
      const componentsA = storeA.components();

      for (let i = 0; i < entityIds.length; i += 1) {
        const entityId = entityIds[i];
        const componentA = componentsA[i];
        if (entityId === undefined || componentA === undefined) {
          continue;
        }

        const componentB = storeB.getByEntityIndex(getEntityIndex(entityId));
        if (componentB === undefined) {
          continue;
        }

        // The sparse-set membership check above proves this entity has both components.
        const intersectedEntityId = entityId as EntityId<TA & TB>;
        callback(intersectedEntityId, componentA, componentB);
      }

      return;
    }

    const entityIds = storeB.entityIds();
    const componentsB = storeB.components();

    for (let i = 0; i < entityIds.length; i += 1) {
      const entityId = entityIds[i];
      const componentB = componentsB[i];
      if (entityId === undefined || componentB === undefined) {
        continue;
      }

      const componentA = storeA.getByEntityIndex(getEntityIndex(entityId));
      if (componentA === undefined) {
        continue;
      }

      // The sparse-set membership check above proves this entity has both components.
      const intersectedEntityId = entityId as EntityId<TA & TB>;
      callback(intersectedEntityId, componentA, componentB);
    }
  }

  forEach3<TA, TB, TC>(
    componentTypeA: Class<TA>,
    componentTypeB: Class<TB>,
    componentTypeC: Class<TC>,
    callback: ForEach3Callback<TA, TB, TC>,
  ): void {
    const storeA = this.componentStores.get(componentTypeA) as ComponentStore<TA> | undefined;
    const storeB = this.componentStores.get(componentTypeB) as ComponentStore<TB> | undefined;
    const storeC = this.componentStores.get(componentTypeC) as ComponentStore<TC> | undefined;

    if (!storeA || !storeB || !storeC) {
      return;
    }

    let smallestStore: ComponentStore<TA | TB | TC> = storeA;
    let smallestKey: "A" | "B" | "C" = "A";

    if (storeB.count() < smallestStore.count()) {
      smallestStore = storeB;
      smallestKey = "B";
    }

    if (storeC.count() < smallestStore.count()) {
      smallestStore = storeC;
      smallestKey = "C";
    }

    const entityIds = smallestStore.entityIds();

    for (let i = 0; i < entityIds.length; i += 1) {
      const entityId = entityIds[i];
      if (entityId === undefined) {
        continue;
      }

      const entityIndex = getEntityIndex(entityId);

      const componentA =
        smallestKey === "A"
          ? storeA.components()[i]
          : storeA.getByEntityIndex(entityIndex);
      if (componentA === undefined) {
        continue;
      }

      const componentB =
        smallestKey === "B"
          ? storeB.components()[i]
          : storeB.getByEntityIndex(entityIndex);
      if (componentB === undefined) {
        continue;
      }

      const componentC =
        smallestKey === "C"
          ? storeC.components()[i]
          : storeC.getByEntityIndex(entityIndex);
      if (componentC === undefined) {
        continue;
      }

      // The sparse-set membership checks above prove this entity has all requested components.
      const intersectedEntityId = entityId as EntityId<TA & TB & TC>;
      callback(intersectedEntityId, componentA, componentB, componentC);
    }
  }

  /**
   * Gets all entities
   */
  getEntities(): EntityId[] {
    return Array.from(this.entities);
  }

  /**
   * Gets all component types currently attached to an entity.
   */
  getComponentTypes(entityId: EntityId): Function[] {
    if (!this.entities.has(entityId)) {
      return [];
    }

    const componentTypes: Function[] = [];

    for (const [componentType, store] of this.componentStores) {
      if (!store.has(entityId)) {
        continue;
      }

      componentTypes.push(componentType);
    }

    return componentTypes;
  }

  /**
   * Clears all entities and components
   */
  clear(): void {
    this.entities.clear();
    this.componentStores.clear();
  }
}
