// packages/engine/src/ecs/storage.ts
import type { EntityId } from "@engine/ecs/entity";
import { getEntityIndex } from "@engine/ecs/entity";

/**
 * Sparse-set component storage.
 * Provides O(1) insertion, deletion, and lookup with cache-friendly dense iteration.
 */
export class ComponentStore<T> {
  private denseComponents: T[] = [];
  private denseEntities: EntityId[] = [];
  private sparse: Map<number, number> = new Map(); // entityIndex -> denseIndex

  /**
   * Adds or replaces a component for an entity
   */
  add(entityId: EntityId, component: T): void {
    const index = getEntityIndex(entityId);

    if (this.sparse.has(index)) {
      // Replace existing component
      const denseIndex = this.sparse.get(index);
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
      this.sparse.set(index, denseIndex);
    }
  }

  /**
   * Gets a component for an entity, or undefined if not present
   */
  get(entityId: EntityId): T | undefined {
    const index = getEntityIndex(entityId);
    const denseIndex = this.sparse.get(index);

    if (denseIndex === undefined) return undefined;
    return this.denseComponents[denseIndex];
  }

  /**
   * Checks if an entity has this component
   */
  has(entityId: EntityId): boolean {
    const index = getEntityIndex(entityId);
    return this.sparse.has(index);
  }

  /**
   * Checks if an entity index has this component.
   */
  hasEntityIndex(entityIndex: number): boolean {
    return this.sparse.has(entityIndex);
  }

  /**
   * Gets a component by entity index, or undefined if not present.
   */
  getByEntityIndex(entityIndex: number): T | undefined {
    const denseIndex = this.sparse.get(entityIndex);
    if (denseIndex === undefined) {
      return undefined;
    }

    return this.denseComponents[denseIndex];
  }

  /**
   * Dense entity list (cache-friendly) matching component order.
   */
  entityIds(): readonly EntityId[] {
    return this.denseEntities;
  }

  /**
   * Removes a component from an entity
   */
  remove(entityId: EntityId): void {
    const index = getEntityIndex(entityId);
    const denseIndex = this.sparse.get(index);

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
      const lastEntityIndex = getEntityIndex(lastEntity);

      this.denseComponents[denseIndex] = lastComponent;
      this.denseEntities[denseIndex] = lastEntity;
      this.sparse.set(lastEntityIndex, denseIndex);
    }

    this.denseComponents.pop();
    this.denseEntities.pop();
    this.sparse.delete(index);
  }

  *[Symbol.iterator](): IterableIterator<[EntityId, T]> {
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
