import { Component } from "@engine/ecs/component";
import type { EntityId } from "@engine/ecs/entity";
import { StateComponent, state } from "@engine/serialization";

/**
 * Marks an entity as a child of another entity.
 */
@StateComponent
export class Parent extends Component {
  @state("int")
  declare public entityId: EntityId;

  constructor(entityId: EntityId) {
    super();
    this.entityId = entityId;
  }
}
