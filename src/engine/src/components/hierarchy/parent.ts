import type { EntityId } from "@engine/ecs/entity";
import { Serializable, serializable } from "@engine/serialization";

/**
 * Marks an entity as a child of another entity.
 */
export class Parent extends Serializable {
  @serializable("int")
  public entityId: EntityId;

  constructor(entityId: EntityId) {
    super();
    this.entityId = entityId;
  }
}
