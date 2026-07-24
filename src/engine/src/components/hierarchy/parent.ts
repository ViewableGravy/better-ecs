import { Component } from "@engine/ecs/component";
import type { EntityId } from "@engine/ecs/entity";

/**
 * Marks an entity as a child of another entity.
 */
export class Parent extends Component {
  #entityId: EntityId;

  public get entityId(): EntityId {
    return this.#entityId;
  }

  constructor(entityId: EntityId) {
    super();
    this.#entityId = entityId;
  }

  /** @internal Parent topology is mutated exclusively by Registry.setParent. */
  public __setEntityId(entityId: EntityId): void {
    this.#entityId = entityId;
  }
}
