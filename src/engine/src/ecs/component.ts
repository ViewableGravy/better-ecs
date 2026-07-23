import type { EntityId } from "@engine/ecs/entity";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export class Component {
  #attachedEntityId: EntityId | undefined;

  get attachedEntityId(): EntityId | undefined {
    return this.#attachedEntityId;
  }

  __attach(entityId: EntityId): void {
    this.#attachedEntityId = entityId;
  }

  __detach(): void {
    this.#attachedEntityId = undefined;
  }
}
