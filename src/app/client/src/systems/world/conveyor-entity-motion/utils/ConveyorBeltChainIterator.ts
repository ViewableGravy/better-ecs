import { ConveyorBeltComponent } from "@client/components/conveyor-belt";
import type { EntityId, UserWorld } from "@engine";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export class ConveyorBeltChainIterator implements IterableIterator<EntityId> {
  private world: UserWorld | null = null;
  private leafEntityId: EntityId | null = null;
  private currentEntityId: EntityId | null = null;

  public setLeaf(world: UserWorld, leafEntityId: EntityId): void {
    this.world = world;
    this.leafEntityId = leafEntityId;
    this.currentEntityId = leafEntityId;
  }

  public iterate(): ConveyorBeltChainIterator {
    this.currentEntityId = this.leafEntityId;
    return this;
  }

  public getInitialNextEntityId(): EntityId | null {
    if (this.world === null || this.leafEntityId === null) {
      return null;
    }

    const leafConveyor = this.world.get(this.leafEntityId, ConveyorBeltComponent);

    if (!leafConveyor || leafConveyor.previousEntityId === null) {
      return null;
    }

    return leafConveyor.nextEntityId;
  }

  public next(): IteratorResult<EntityId> {
    if (this.world === null || this.leafEntityId === null || this.currentEntityId === null) {
      return {
        done: true,
        value: undefined,
      };
    }

    const currentEntityId = this.currentEntityId;
    const currentConveyor = this.world.get(currentEntityId, ConveyorBeltComponent);

    if (!currentConveyor) {
      this.currentEntityId = null;

      return {
        done: true,
        value: undefined,
      };
    }

    this.currentEntityId = currentConveyor.previousEntityId === this.leafEntityId
      ? null
      : currentConveyor.previousEntityId;

    return {
      done: false,
      value: currentEntityId,
    };
  }

  public [Symbol.iterator](): ConveyorBeltChainIterator {
    return this;
  }
}