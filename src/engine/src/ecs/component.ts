import type { EntityId } from "@engine/ecs/entity";

export interface ComponentOwner {
  notifyComponentChanged(entityId: EntityId, component: Component): void;
}

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export class Component {
  #attachedEntityId: EntityId | undefined;
  #owner: ComponentOwner | undefined;

  get attachedEntityId(): EntityId | undefined {
    return this.#attachedEntityId;
  }

  __attach(entityId: EntityId, owner?: ComponentOwner): void {
    this.#attachedEntityId = entityId;
    this.#owner = owner;
  }

  __detach(): void {
    this.#attachedEntityId = undefined;
    this.#owner = undefined;
  }

  /** Notify engine-owned observers after a public component field changes. */
  protected __markChanged(): void {
    const entityId = this.#attachedEntityId;
    if (entityId === undefined || !this.#owner) {
      return;
    }

    this.#owner.notifyComponentChanged(entityId, this);
  }
}
