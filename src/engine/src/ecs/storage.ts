// packages/engine/src/ecs/storage.ts
import type { EntityId } from "@engine/ecs/entity";

/**
 * Sparse-set component storage.
 * Provides O(1) insertion, deletion, and lookup with cache-friendly dense iteration.
 */
export class ComponentStore<T> {
  private denseComponents: T[] = [];
  private denseEntities: EntityId<T>[] = [];
  private sparse = new Map<EntityId, number>();

  /**
   * Adds or replaces a component for an entity
   */
  add(entityId: EntityId<T>, component: T): void {
    if (this.sparse.has(entityId)) {
      // Replace existing component
      const denseIndex = this.sparse.get(entityId);
      if (denseIndex === undefined) {
        throw new Error(
          "ComponentStore invariant violated: missing dense index for existing sparse entry",
        );
      }
      this.denseComponents[denseIndex] = component;
    } else {
      // Add new component
      const denseIndex = this.denseComponents.length;
      this.denseComponents.push(component);
      this.denseEntities.push(entityId);
      this.sparse.set(entityId, denseIndex);
    }
  }

  /**
   * Gets a component for an entity, or undefined if not present
   */
  get(entityId: EntityId<T>): T | undefined {
    const denseIndex = this.sparse.get(entityId);

    if (denseIndex === undefined) return undefined;
    return this.denseComponents[denseIndex];
  }

  /**
   * Checks if an entity has this component
   */
  has(entityId: EntityId<T>): boolean {
    return this.sparse.has(entityId);
  }

  /**
   * Checks if an entity has this component.
   */
  hasEntityId(entityId: EntityId): boolean {
    return this.sparse.has(entityId);
  }

  /**
   * Gets a component by entity ID, or undefined if not present.
   */
  getByEntityId(entityId: EntityId): T | undefined {
    const denseIndex = this.sparse.get(entityId);
    if (denseIndex === undefined) {
      return undefined;
    }

    return this.denseComponents[denseIndex];
  }

  /**
   * Dense entity list (cache-friendly) matching component order.
   */
  entityIds(): readonly EntityId<T>[] {
    return this.denseEntities as readonly EntityId<T>[];
  }

  /**
   * Removes a component from an entity
   */
  remove(entityId: EntityId<T>): void {
    const denseIndex = this.sparse.get(entityId);

    if (denseIndex === undefined) return;

    // Swap-remove: move last element to this position
    const lastDenseIndex = this.denseComponents.length - 1;
    if (denseIndex !== lastDenseIndex) {
      const lastComponent = this.denseComponents[lastDenseIndex];
      const lastEntity = this.denseEntities[lastDenseIndex];
      if (lastComponent === undefined) {
        throw new Error(
          "ComponentStore invariant violated: missing last dense component during swap-remove",
        );
      }
      if (lastEntity === undefined) {
        throw new Error(
          "ComponentStore invariant violated: missing last entity mapping during swap-remove",
        );
      }
      this.denseComponents[denseIndex] = lastComponent;
      this.denseEntities[denseIndex] = lastEntity;
      this.sparse.set(lastEntity, denseIndex);
    }

    this.denseComponents.pop();
    this.denseEntities.pop();
    this.sparse.delete(entityId);
  }

  *[Symbol.iterator](): IterableIterator<[EntityId<T>, T]> {
    for (let i = 0; i < this.denseComponents.length; i += 1) {
      const component = this.denseComponents[i];
      const entityId = this.denseEntities[i];
      if (entityId === undefined) {
        throw new Error(
          "ComponentStore invariant violated: missing entity mapping during iteration",
        );
      }
      yield [entityId, component];
    }
  }

  /**
   * Gets all component values (dense array, cache-friendly)
   */
  components(): T[] {
    return this.denseComponents;
  }

  /**
   * Gets the number of entities with this component
   */
  count(): number {
    return this.denseComponents.length;
  }

  /**
   * Clears all components
   */
  clear(): void {
    this.denseComponents = [];
    this.denseEntities = [];
    this.sparse.clear();
  }
}
