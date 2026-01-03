// packages/engine/src/ecs/storage.ts
import type { EntityId } from './entity';
import { getEntityIndex } from './entity';

/**
 * Sparse-set component storage.
 * Provides O(1) insertion, deletion, and lookup with cache-friendly dense iteration.
 */
export class ComponentStore<T> {
  private dense: T[] = [];
  private sparse: Map<number, number> = new Map(); // entityIndex -> denseIndex
  private entityMap: Map<number, EntityId> = new Map(); // denseIndex -> entityId

  /**
   * Adds or replaces a component for an entity
   */
  add(entityId: EntityId, component: T): void {
    const index = getEntityIndex(entityId);
    
    if (this.sparse.has(index)) {
      // Replace existing component
      const denseIndex = this.sparse.get(index)!;
      this.dense[denseIndex] = component;
    } else {
      // Add new component
      const denseIndex = this.dense.length;
      this.dense.push(component);
      this.sparse.set(index, denseIndex);
      this.entityMap.set(denseIndex, entityId);
    }
  }

  /**
   * Gets a component for an entity, or undefined if not present
   */
  get(entityId: EntityId): T | undefined {
    const index = getEntityIndex(entityId);
    const denseIndex = this.sparse.get(index);
    
    if (denseIndex === undefined) return undefined;
    return this.dense[denseIndex];
  }

  /**
   * Checks if an entity has this component
   */
  has(entityId: EntityId): boolean {
    const index = getEntityIndex(entityId);
    return this.sparse.has(index);
  }

  /**
   * Removes a component from an entity
   */
  remove(entityId: EntityId): void {
    const index = getEntityIndex(entityId);
    const denseIndex = this.sparse.get(index);
    
    if (denseIndex === undefined) return;

    // Swap-remove: move last element to this position
    const lastDenseIndex = this.dense.length - 1;
    if (denseIndex !== lastDenseIndex) {
      const lastEntity = this.entityMap.get(lastDenseIndex);
      const lastEntityIndex = lastEntity !== undefined ? getEntityIndex(lastEntity) : -1;
      
      this.dense[denseIndex] = this.dense[lastDenseIndex];
      this.sparse.set(lastEntityIndex, denseIndex);
      this.entityMap.set(denseIndex, lastEntity!);
    }

    this.dense.pop();
    this.sparse.delete(index);
    this.entityMap.delete(lastDenseIndex);
  }

  *[Symbol.iterator](): IterableIterator<[EntityId, T]> {
    for (let i = 0; i < this.dense.length; i++) {
      const entityId = this.entityMap.get(i)!;
      const component = this.dense[i];
      yield [entityId, component];
    }
  }

  /**
   * Gets all component values (dense array, cache-friendly)
   */
  components(): T[] {
    return this.dense;
  }

  /**
   * Gets the number of entities with this component
   */
  count(): number {
    return this.dense.length;
  }

  /**
   * Clears all components
   */
  clear(): void {
    this.dense = [];
    this.sparse.clear();
    this.entityMap.clear();
  }
}
