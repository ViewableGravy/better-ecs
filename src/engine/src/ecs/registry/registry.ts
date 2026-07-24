import { Parent } from "@engine/components";
import { Component } from "@engine/ecs/component";
import type {
  EntityComponentLookupResult,
  EntityId,
  InvariantQueryResult,
  QueryResult,
} from "@engine/ecs/entity";
import { EntityIdAllocator } from "@engine/ecs/entity";
import { QueryCursor2, type QueryCursorSource } from "@engine/ecs/query-cursor";
import { ComponentStore } from "@engine/ecs/storage";
import type {
  ComponentMutationKind,
  RegistryMutationObserver,
} from "@engine/ecs/registry/types";
import invariant from "tiny-invariant";
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

export class Registry implements QueryCursorSource {
  private readonly entities = new Set<EntityId>();
  private readonly componentStores = new Map<Function, ComponentStore<unknown>>();
  private readonly entityIds = new EntityIdAllocator();
  private activeQueryTraversals = 0;

  private readonly mutationObservers = new Set<RegistryMutationObserver>();
  private readonly childrenByParent = new Map<EntityId, Set<EntityId>>();
  private readonly parentByChild = new Map<EntityId, EntityId>();

  /**
   * Creates a new entity
   */
  create(): EntityId {
    this.assertStructuralMutationAllowed("create an entity");
    const entityId = this.entityIds.create();
    this.entities.add(entityId);
    return entityId;
  }

  /**
   * Destroys one entity, or every entity matching the supplied component types.
   */
  destroy(...componentTypes: Function[]): void;
  destroy(entityId: EntityId): void;
  destroy(entityIdOrComponentType: EntityId | Function, ...componentTypes: Function[]): void {
    if (typeof entityIdOrComponentType === "number") {
      this.destroyOne(entityIdOrComponentType);
      return;
    }

    const entityIds = this.query(
      entityIdOrComponentType as Class<unknown>,
      ...(componentTypes as Class<unknown>[]),
    );
    for (const entityId of entityIds) {
      this.destroyOne(entityId);
    }
  }

  private destroyOne(entityId: EntityId): void {
    this.assertStructuralMutationAllowed("destroy an entity");
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
    for (const [componentType, store] of this.componentStores) {
      const component = store.get(entityId);
      if (component === undefined) {
        continue;
      }

      if (componentType === Parent) {
        this.detachParent(entityId);
      }

      if (component instanceof Component) {
        component.__detach();
      }

      store.remove(entityId);
      this.notifyComponentChanged(entityId, componentType, "removed", component);
    }

    this.childrenByParent.delete(entityId);
    this.entities.delete(entityId);
    this.notifyEntityChanged(entityId);
  }

  private collectDescendants(entityId: EntityId): EntityId[] {
    const descendants: EntityId[] = [];
    const stack: EntityId[] = [entityId];

    while (stack.length > 0) {
      const current = stack.pop();
      if (current === undefined) {
        continue;
      }

      const children = this.childrenByParent.get(current);
      if (!children) {
        continue;
      }

      for (const childEntityId of children) {
        descendants.push(childEntityId);
        stack.push(childEntityId);
      }
    }

    return descendants;
  }

  /**
   * Adds or replaces a component on an entity
   */
  add<T extends object>(entityId: EntityId, componentType: Class<T>, component: T): void;
  add<T extends object>(entityId: EntityId, component: T): void;
  add<T extends object>(entityId: EntityId, componentTypeOrComponent: Class<T> | T, component?: T): void {
    this.assertStructuralMutationAllowed("add or replace a component");

    if (!this.entities.has(entityId)) {
      throw new Error(`Entity ${entityId} does not exist`);
    }

    const componentType =
      component !== undefined
        ? (componentTypeOrComponent as Function)
        : componentTypeOrComponent.constructor;
    const comp = component !== undefined ? component : (componentTypeOrComponent as T);

    if (componentType === Parent && comp instanceof Parent) {
      this.setParent(entityId, comp.entityId);
      return;
    }

    this.addOrReplaceComponent(entityId, componentType, comp);
  }

  private addOrReplaceComponent<T>(entityId: EntityId, componentType: Function, component: T): void {
    let store = this.componentStores.get(componentType) as ComponentStore<T> | undefined;
    if (!store) {
      store = new ComponentStore<T>();
      this.componentStores.set(componentType, store);
    }

    const replaced = store.get(entityId);
    if (replaced instanceof Component && replaced !== component) {
      replaced.__detach();
    }

    store.add(entityId, component);

    if (component instanceof Component) {
      component.__attach(entityId);
    }

    this.notifyComponentChanged(
      entityId,
      componentType,
      replaced === undefined ? "added" : "patched",
      component,
    );
  }

  /**
   * Gets a component from an entity
   */
  get<T, TEntityComponents>(
    entityId: EntityId<TEntityComponents>,
    componentType: Class<T>,
  ): EntityComponentLookupResult<TEntityComponents, T>;
  get<T>(entityId: EntityId, componentType: Class<T>): T | undefined {
    const store = this.componentStores.get(componentType);

    if (!store) {
      return undefined;
    }

    return (store as ComponentStore<T>).get(entityId);
  }

  /** Returns an existing component or throws when the entity does not own it. */
  require<T>(entityId: EntityId, componentType: Class<T>): T {
    const component = this.get(entityId, componentType);
    invariant(component, `Component ${componentType.name} does not exist on entity ${entityId}`);
    return component;
  }

  /**
   * Mutates an existing component and publishes exactly once even when the callback throws after a partial write.
   */
  patch<T>(entityId: EntityId, componentType: Class<T>, callback: PatchCallback<T>): T {
    if (componentType === Parent) {
      throw new Error("Parent cannot be patched directly; use setParent or removeParent");
    }

    const component = this.get(entityId, componentType);

    invariant(component, `Component ${componentType.name} does not exist on entity ${entityId}`);

    try {
      callback(component);
    } finally {
      this.notifyComponentChanged(entityId, componentType, "patched", component);
    }

    return component;
  }

  /** Mutates and publishes an existing component, or returns undefined without invoking the callback. */
  tryPatch<T>(
    entityId: EntityId,
    componentType: Class<T>,
    callback: PatchCallback<T>,
  ): T | undefined {
    if (componentType === Parent) {
      throw new Error("Parent cannot be patched directly; use setParent or removeParent");
    }

    const component = this.get(entityId, componentType);
    if (component === undefined) {
      return undefined;
    }

    try {
      callback(component);
    } finally {
      this.notifyComponentChanged(entityId, componentType, "patched", component);
    }

    return component;
  }

  /**
   * Checks if an entity has a component
   */
  has<T>(entityId: EntityId, componentType: Class<T>): entityId is EntityId<T> {
    const store = this.componentStores.get(componentType);
    if (!store) return false;
    return store.has(entityId);
  }

  /**
   * Removes a component from an entity
   */
  remove<T>(entityId: EntityId, componentType: Class<T>): void {
    this.assertStructuralMutationAllowed("remove a component");
    if (componentType === Parent) {
      this.removeParent(entityId);
      return;
    }

    const store = this.componentStores.get(componentType);
    if (store) {
      const component = (store as ComponentStore<T>).get(entityId);
      if (component instanceof Component) {
        component.__detach();
      }

      store.remove(entityId);
      if (component !== undefined) {
        this.notifyComponentChanged(entityId, componentType, "removed", component);
      }
    }
  }

  /** Attaches or reparents an entity and updates the reverse hierarchy index. */
  setParent(childEntityId: EntityId, parentEntityId: EntityId): void {
    this.assertHierarchyEntity(childEntityId, "Child");
    this.assertHierarchyEntity(parentEntityId, "Parent");

    if (childEntityId === parentEntityId) {
      throw new Error(`Entity ${childEntityId} cannot be its own parent`);
    }

    const currentParentEntityId = this.parentByChild.get(childEntityId);
    if (currentParentEntityId === parentEntityId) {
      return;
    }

    const store = this.componentStores.get(Parent) as ComponentStore<Parent> | undefined;
    const parent = store?.get(childEntityId);
    if (!parent) {
      this.assertStructuralMutationAllowed("attach an entity parent");
    }

    this.assertNoHierarchyCycle(childEntityId, parentEntityId);
    this.detachParent(childEntityId);
    this.attachParent(childEntityId, parentEntityId);

    if (parent) {
      parent.__setEntityId(parentEntityId);
      this.notifyComponentChanged(childEntityId, Parent, "patched", parent);
      return;
    }

    this.addOrReplaceComponent(
      childEntityId,
      Parent,
      new Parent(parentEntityId),
    );
  }

  /** Detaches an entity from its parent and updates the reverse hierarchy index. */
  removeParent(childEntityId: EntityId): void {
    this.assertStructuralMutationAllowed("remove an entity parent");
    const store = this.componentStores.get(Parent) as ComponentStore<Parent> | undefined;
    const parent = store?.get(childEntityId);
    if (!store || !parent) {
      return;
    }

    this.detachParent(childEntityId);
    parent.__detach();
    store.remove(childEntityId);
    this.notifyComponentChanged(childEntityId, Parent, "removed", parent);
  }

  /** Returns cached children without rebuilding or allocating hierarchy state. */
  getChildren(parentEntityId: EntityId): ReadonlySet<EntityId> | undefined {
    return this.childrenByParent.get(parentEntityId);
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
   * - Membership checks use the full entity ID, so stale IDs cannot alias later entities.
   */
  query<const TComponentTypes extends readonly Class<unknown>[]>(
    ...componentTypes: TComponentTypes
  ): QueryResult<TComponentTypes> {
    // No filter means "all entities".
    if (componentTypes.length === 0) {
      // Query metadata is compile-time only, so the runtime array can be reused as-is.
      return this.all() as QueryResult<TComponentTypes>;
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
      let matchesAll = true;

      for (const store of otherStores) {
        if (!store.hasEntityId(entityId)) {
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

  /**
   * Traverses matching entities without allocating result rows.
   * Structural registry mutation throws until traversal completes.
   */
  forEach<TA>(componentTypeA: Class<TA>, callback: ForEach1Callback<TA>): void;
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
      this.forEachThree(
        componentTypeA as Class<unknown>,
        componentTypeBOrCallback as Class<unknown>,
        componentTypeCOrCallback as Class<unknown>,
        maybeCallback as ForEach3Callback<unknown, unknown, unknown>,
      );
      return;
    }

    if (typeof componentTypeCOrCallback === "function") {
      this.forEachTwo(
        componentTypeA as Class<unknown>,
        componentTypeBOrCallback as Class<unknown>,
        componentTypeCOrCallback as ForEach2Callback<unknown, unknown>,
      );
      return;
    }

    this.forEachOne(
      componentTypeA as Class<unknown>,
      componentTypeBOrCallback as ForEach1Callback<unknown>,
    );
  }

  private forEachOne<TA>(componentTypeA: Class<TA>, callback: ForEach1Callback<TA>): void {
    const storeA = this.componentStores.get(componentTypeA) as ComponentStore<TA> | undefined;
    if (!storeA) {
      return;
    }

    const entities = storeA.entityIds();
    const components = storeA.components();

    this.beginQueryTraversal();
    try {
      for (let i = 0; i < entities.length; i += 1) {
        const entityId = entities[i];
        const componentA = components[i];

        if (entityId === undefined || componentA === undefined) {
          continue;
        }

        callback(entityId, componentA);
      }
    } finally {
      this.endQueryTraversal();
    }
  }

  private forEachTwo<TA, TB>(
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

    this.beginQueryTraversal();
    try {
      if (iterateAFirst) {
        const entityIds = storeA.entityIds();
        const componentsA = storeA.components();

        for (let i = 0; i < entityIds.length; i += 1) {
          const entityId = entityIds[i];
          const componentA = componentsA[i];
          if (entityId === undefined || componentA === undefined) {
            continue;
          }

          const componentB = storeB.getByEntityId(entityId);
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

        const componentA = storeA.getByEntityId(entityId);
        if (componentA === undefined) {
          continue;
        }

        // The sparse-set membership check above proves this entity has both components.
        const intersectedEntityId = entityId as EntityId<TA & TB>;
        callback(intersectedEntityId, componentA, componentB);
      }
    } finally {
      this.endQueryTraversal();
    }
  }

  private forEachThree<TA, TB, TC>(
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

    this.beginQueryTraversal();
    try {
      for (let i = 0; i < entityIds.length; i += 1) {
        const entityId = entityIds[i];
        if (entityId === undefined) {
          continue;
        }

        const componentA =
          smallestKey === "A"
            ? storeA.components()[i]
            : storeA.getByEntityId(entityId);
        if (componentA === undefined) {
          continue;
        }

        const componentB =
          smallestKey === "B"
            ? storeB.components()[i]
            : storeB.getByEntityId(entityId);
        if (componentB === undefined) {
          continue;
        }

        const componentC =
          smallestKey === "C"
            ? storeC.components()[i]
            : storeC.getByEntityId(entityId);
        if (componentC === undefined) {
          continue;
        }

        // The sparse-set membership checks above prove this entity has all requested components.
        const intersectedEntityId = entityId as EntityId<TA & TB & TC>;
        callback(intersectedEntityId, componentA, componentB, componentC);
      }
    } finally {
      this.endQueryTraversal();
    }
  }

  createQueryCursor<TA, TB>(
    componentTypeA: Class<TA>,
    componentTypeB: Class<TB>,
  ): QueryCursor2<TA, TB> {
    return new QueryCursor2(this, componentTypeA, componentTypeB);
  }

  invariantQuery<const TComponentTypes extends readonly Class<unknown>[]>(
    ...componentTypes: TComponentTypes
  ): InvariantQueryResult<TComponentTypes> {
    const results = this.query(...componentTypes);
    invariant(
      results.length > 0,
      `Invariant query for components [${componentTypes.map((type) => type.name).join(", ")}] returned no results`,
    );
    return results as InvariantQueryResult<TComponentTypes>;
  }

  /** @internal Resolves a component store when a reusable query cursor begins traversal. */
  getQueryCursorStore<T>(componentType: Class<T>): ComponentStore<T> | undefined {
    return this.componentStores.get(componentType) as ComponentStore<T> | undefined;
  }

  /** @internal Begins a reusable cursor traversal. */
  beginQueryCursorTraversal(): void {
    this.beginQueryTraversal();
  }

  /** @internal Ends a reusable cursor traversal. */
  endQueryCursorTraversal(): void {
    this.endQueryTraversal();
  }

  /**
   * Gets all entities
   */
  all(): EntityId[] {
    return Array.from(this.entities);
  }

  /** Returns the number of entities that own a component type. */
  getComponentCount(componentType: Function): number {
    return this.componentStores.get(componentType)?.count() ?? 0;
  }

  /** Returns a component store's dense entity view. Structural mutations invalidate iteration. */
  getComponentEntityIds(componentType: Function): readonly EntityId[] {
    return this.componentStores.get(componentType)?.entityIds() ?? [];
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
    this.assertStructuralMutationAllowed("clear the registry");

    for (const store of this.componentStores.values()) {
      for (const [, component] of store) {
        if (component instanceof Component) {
          component.__detach();
        }
      }
    }

    this.entities.clear();
    this.componentStores.clear();
    this.childrenByParent.clear();
    this.parentByChild.clear();
    for (const observer of this.mutationObservers) {
      observer.registryReset?.(this);
    }
  }

  /** @internal Subscribe to mutation events used by retained engine integrations. */
  observeMutations(observer: RegistryMutationObserver): () => void {
    this.mutationObservers.add(observer);
    return () => void this.mutationObservers.delete(observer);
  }

  notifyEntityChanged(entityId: EntityId): void {
    for (const observer of this.mutationObservers) {
      observer.entityChanged?.(this, entityId);
    }
  }

  private notifyComponentChanged(
    entityId: EntityId,
    componentType: Function,
    kind: ComponentMutationKind,
    component: unknown,
  ): void {
    for (const observer of this.mutationObservers) {
      if (observer.componentChanged) {
        observer.componentChanged(this, entityId, componentType, kind, component);
        continue;
      }

      observer.entityChanged?.(this, entityId);
    }
  }

  private attachParent(childEntityId: EntityId, parentEntityId: EntityId): void {
    this.parentByChild.set(childEntityId, parentEntityId);
    let children = this.childrenByParent.get(parentEntityId);
    if (!children) {
      children = new Set();
      this.childrenByParent.set(parentEntityId, children);
    }
    children.add(childEntityId);
  }

  private detachParent(childEntityId: EntityId): void {
    const parentEntityId = this.parentByChild.get(childEntityId);
    if (parentEntityId === undefined) {
      return;
    }

    this.parentByChild.delete(childEntityId);
    const children = this.childrenByParent.get(parentEntityId);
    children?.delete(childEntityId);
    if (children?.size === 0) {
      this.childrenByParent.delete(parentEntityId);
    }
  }

  private assertHierarchyEntity(entityId: EntityId, label: string): void {
    if (!this.entities.has(entityId)) {
      throw new Error(`${label} entity ${entityId} does not exist`);
    }
  }

  private assertNoHierarchyCycle(childEntityId: EntityId, parentEntityId: EntityId): void {
    let ancestorEntityId: EntityId | undefined = parentEntityId;

    while (ancestorEntityId !== undefined) {
      if (ancestorEntityId === childEntityId) {
        throw new Error(`Setting parent ${parentEntityId} on entity ${childEntityId} would create a cycle`);
      }

      ancestorEntityId = this.parentByChild.get(ancestorEntityId);
    }
  }

  private beginQueryTraversal(): void {
    this.activeQueryTraversals += 1;
  }

  private endQueryTraversal(): void {
    if (this.activeQueryTraversals === 0) {
      throw new Error("Registry query traversal invariant violated: no active traversal to end");
    }

    this.activeQueryTraversals -= 1;
  }

  private assertStructuralMutationAllowed(operation: string): void {
    if (this.activeQueryTraversals === 0) {
      return;
    }

    throw new Error(`Cannot ${operation} during active query traversal`);
  }
}
