import { Component } from "@engine/ecs/component";
import type { EntityId } from "@engine/ecs/entity";

/**
 * Marks an entity as a child of another entity.
 */
export class Parent extends Component {
  #entityId: EntityId;

  get entityId(): EntityId {
    return this.#entityId;
  }

  set entityId(value: EntityId) {
    if (this.#entityId === value) {
      return;
    }

    this.#entityId = value;
    this.__markChanged();
  }

  constructor(entityId: EntityId) {
    super();
    this.#entityId = entityId;
  }
}
