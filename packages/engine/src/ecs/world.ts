// packages/engine/src/ecs/world.ts
import type { Class } from "type-fest";
import type { EntityId } from "./entity";
import { createEntityId, invalidateEntity } from "./entity";
import { ComponentStore } from "./storage";

export interface IUserWorld {
  create(): EntityId;

  destroy(...componentTypes: Function[]): void;
  destroy(entityId: EntityId): void;

  add<T>(entityId: EntityId, componentType: Class<T>, component: T): void;
  add<T>(entityId: EntityId, component: T): void;
  get<T>(entityId: EntityId, componentType: Class<T>): T | undefined;
  require<T>(entityId: EntityId, componentType: Class<T>): T;
  all(): EntityId[];
  has(entityId: EntityId, componentType: Class<any>): boolean;
  remove(entityId: EntityId, componentType: Class<any>): void;

  query(...componentTypes: Function[]): EntityId[];
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
      const entities = this.world.query(arg, ...componentTypes);
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

  get<T>(entityId: EntityId, componentType: Class<T>): T | undefined {
    return this.world.getComponent<T>(entityId, componentType);
  }

  /**
   * Gets a component from an entity, throwing an error if it doesn't exist.
   * 
   * @throws {Error} If the component does not exist on the entity
   */
  require<T>(entityId: EntityId, componentType: Class<T>): T {
    const component = this.world.getComponent<T>(entityId, componentType);
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

  has(entityId: EntityId, componentType: Class<any>): boolean {
    return this.world.hasComponent(entityId, componentType);
  }

  remove(entityId: EntityId, componentType: Class<any>): void {
    this.world.removeComponent(entityId, componentType);
  }

  query(...componentTypes: Function[]): EntityId[] {
    return this.world.query(...componentTypes);
  }

  invariantQuery(...componentTypes: Function[]): [EntityId, ...EntityId[]] {
    const results = this.world.query(...componentTypes);
    if (results.length === 0) {
      throw new Error(
        `Invariant query for components [${componentTypes.map((t) => t.name).join(", ")}] returned no results`,
      );
    }
    return results as [EntityId, ...EntityId[]];
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

    // Remove from all component stores
    for (const store of this.componentStores.values()) {
      store.remove(entityId);
    }

    invalidateEntity(entityId);
    this.entities.delete(entityId);
  }

  /**
   * Adds or replaces a component on an entity
   */
  addComponent<T>(entityId: EntityId, componentType: Function, component: T): void;
  addComponent<T>(entityId: EntityId, component: T): void;
  addComponent<T>(entityId: EntityId, componentTypeOrComponent: Function | T, component?: T): void {
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
  getComponent<T>(entityId: EntityId, componentType: Function): T | undefined {
    const store = this.componentStores.get(componentType);
    if (!store) return undefined;
    return (store as ComponentStore<T>).get(entityId);
  }

  /**
   * Checks if an entity has a component
   */
  hasComponent(entityId: EntityId, componentType: Function): boolean {
    const store = this.componentStores.get(componentType);
    if (!store) return false;
    return store.has(entityId);
  }

  /**
   * Removes a component from an entity
   */
  removeComponent(entityId: EntityId, componentType: Function): void {
    const store = this.componentStores.get(componentType);
    if (store) {
      store.remove(entityId);
    }
  }

  /**
   * Queries entities by component types (intersection)
   */
  query(...componentTypes: Function[]): EntityId[] {
    if (componentTypes.length === 0) {
      return this.getEntities();
    }

    // Use the smallest store as the base to iterate
    let smallestStore: ComponentStore<any> | undefined;
    let smallestCount = Infinity;

    for (const componentType of componentTypes) {
      const store = this.componentStores.get(componentType);

      if (!store) return []; // No entities have all required components

      // Since we will short circuit if any store is missing,
      // we know all entities for this store are in other stores,
      // but we only keep the smallest one to iterate over
      if (store.count() < smallestCount) {
        smallestStore = store;
        smallestCount = store.count();
      }
    }

    if (!smallestStore) return [];

    const result: EntityId[] = [];

    for (const [entityId] of smallestStore) {
      let matchesAll = true;

      for (const componentType of componentTypes) {
        if (!this.hasComponent(entityId, componentType)) {
          matchesAll = false;
          break;
        }
      }

      if (matchesAll) {
        result.push(entityId);
      }
    }

    return result;
  }

  /**
   * Gets all entities
   */
  getEntities(): EntityId[] {
    return Array.from(this.entities);
  }

  /**
   * Clears all entities and components
   */
  clear(): void {
    this.entities.clear();
    this.componentStores.clear();
  }
}
