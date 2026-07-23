import { Component } from "@engine/ecs/component";
import type { EntityId } from "@engine/ecs/entity";

/**
 * Marks an entity as a child of another entity.
 */
export class Parent extends Component {
  declare public entityId: EntityId;

  constructor(entityId: EntityId) {
    super();
    this.entityId = entityId;
  }
}
