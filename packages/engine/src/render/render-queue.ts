import type { EntityId } from "../ecs/entity";

/**
 * A queue of entities to be rendered in the current frame.
 * This replaces the generic CommandBuffer with typed arrays for standard primitives,
 * reducing garbage collection pressure.
 */
export class RenderQueue {
  /** List of entities with Sprite components to render */
  public sprites: EntityId[] = [];

  /** List of entities with Shape components to render */
  public shapes: EntityId[] = [];

  /**
   * Add a sprite entity to the render queue.
   */
  addSprite(entityId: EntityId): void {
    this.sprites.push(entityId);
  }

  /**
   * Add a shape entity to the render queue.
   */
  addShape(entityId: EntityId): void {
    this.shapes.push(entityId);
  }

  /**
   * Clear all queues. Call this at the start of each frame.
   */
  clear(): void {
    this.sprites.length = 0;
    this.shapes.length = 0;
  }

  /**
   * Sort the sprite queue using a comparison function.
   * Useful for z-sorting (painters algorithm).
   */
  sortSprites(compare: (a: EntityId, b: EntityId) => number): void {
    this.sprites.sort(compare);
  }

  /**
   * Sort the shape queue using a comparison function.
   */
  sortShapes(compare: (a: EntityId, b: EntityId) => number): void {
    this.shapes.sort(compare);
  }
}
