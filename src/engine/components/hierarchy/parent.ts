import type { EntityId } from "@engine/ecs/entity";

/**
 * Marks an entity as a child of another entity.
 */
export class Parent {
  constructor(public entityId: EntityId) {}
}
