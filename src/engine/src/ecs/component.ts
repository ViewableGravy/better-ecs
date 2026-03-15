import type { EntityId } from "@engine/ecs/entity";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export class Component {
  #attachedEntityId: EntityId | undefined;
  #worldId: string | undefined;
  #version = 0;
  #dirty = false;

  get attachedEntityId(): EntityId | undefined {
    return this.#attachedEntityId;
  }

  get worldId(): string | undefined {
    return this.#worldId;
  }

  get version(): number {
    return this.#version;
  }

  get dirty(): boolean {
    return this.#dirty;
  }

  get isAttached(): boolean {
    return this.#attachedEntityId !== undefined && this.#worldId !== undefined;
  }

  __attach(entityId: EntityId, worldId: string): void {
    this.#attachedEntityId = entityId;
    this.#worldId = worldId;
  }

  __detach(): void {
    this.#attachedEntityId = undefined;
    this.#worldId = undefined;
    this.#dirty = false;
  }

  __markDirty(version: number): void {
    this.#version = version;
    this.#dirty = true;
  }

  __clearDirty(version: number): void {
    if (this.#version <= version) {
      this.#dirty = false;
    }
  }

  protected onAfterDeserialized(): void {
    return;
  }
}