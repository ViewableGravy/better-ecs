import { Component } from "@engine/ecs/component";
import type { EntityId } from "@engine/ecs/entity";
import { SerializableComponent, serializable } from "@engine/serialization";

/**
 * Marks an entity as a child of another entity.
 */
@SerializableComponent
export class Parent extends Component {
  @serializable("int")
  declare public entityId: EntityId;

  constructor(entityId: EntityId) {
    super();
    this.entityId = entityId;
  }
}
