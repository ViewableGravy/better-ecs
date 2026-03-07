import {
  ConveyorBeltComponent,
  type ConveyorSide,
  type ConveyorSlotIndex,
} from "@client/components/conveyor-belt";
import { BeltItemRailsUtility } from "@client/entities/transport-belt";
import {
  CONVEYOR_SIDES,
  CONVEYOR_SLOT_INDICES_ASC,
  CONVEYOR_SLOT_INDICES_DESC,
  SHARED_SLOT_POSITION,
} from "@client/systems/world/conveyor-entity-motion/constants";
import type { EntityId, UserWorld } from "@engine";
import { Parent, Transform2D } from "@engine/components";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export class ConveyorEntityMotionUtils {
  public static advanceBeltLineFromLeaf(
    world: UserWorld,
    leafEntityId: EntityId,
    progressDelta: number,
  ): void {
    let nextEntityId = this.resolveTraversalNextEntityId(world, leafEntityId);
    let currentEntityId: EntityId | null = leafEntityId;
    let shouldStopOnLeafEntityId = false;

    while (currentEntityId !== null) {
      const currentConveyor: ConveyorBeltComponent | undefined = world.get(currentEntityId, ConveyorBeltComponent);

      if (!currentConveyor) {
        break;
      }

      const nextConveyor = nextEntityId === null
        ? null
        : world.get(nextEntityId, ConveyorBeltComponent) ?? null;

      this.advanceConveyor(
        world,
        currentConveyor,
        nextEntityId,
        nextConveyor,
        progressDelta,
      );
      nextEntityId = currentEntityId;

      if (currentConveyor.previousEntityId === leafEntityId) {
        shouldStopOnLeafEntityId = true;
      }

      currentEntityId = shouldStopOnLeafEntityId ? null : currentConveyor.previousEntityId;
    }

    currentEntityId = leafEntityId;
    shouldStopOnLeafEntityId = false;

    while (currentEntityId !== null) {
      const currentConveyor: ConveyorBeltComponent | undefined = world.get(currentEntityId, ConveyorBeltComponent);

      if (!currentConveyor) {
        break;
      }

      this.syncConveyorTransforms(world, currentConveyor);

      if (currentConveyor.previousEntityId === leafEntityId) {
        shouldStopOnLeafEntityId = true;
      }

      currentEntityId = shouldStopOnLeafEntityId ? null : currentConveyor.previousEntityId;
    }
  }

  public static advanceConveyor(
    world: UserWorld,
    conveyor: ConveyorBeltComponent,
    nextConveyorEntityId: EntityId | null,
    nextConveyor: ConveyorBeltComponent | null,
    progressDelta: number,
  ): void {
    for (const side of CONVEYOR_SIDES) {
      this.advanceLane(world, conveyor, nextConveyorEntityId, nextConveyor, side, progressDelta);
    }
  }

  public static syncConveyorTransforms(
    world: UserWorld,
    conveyor: ConveyorBeltComponent,
  ): void {
    for (const side of CONVEYOR_SIDES) {
      this.syncLaneTransforms(world, conveyor, side);
    }
  }

  private static advanceLane(
    world: UserWorld,
    conveyor: ConveyorBeltComponent,
    nextConveyorEntityId: EntityId | null,
    nextConveyor: ConveyorBeltComponent | null,
    side: ConveyorSide,
    progressDelta: number,
  ): void {
    const slots = this.resolveSlots(conveyor, side);
    const progress = this.resolveProgress(conveyor, side);
    const nextSlots = nextConveyor ? this.resolveSlots(nextConveyor, side) : null;
    const nextProgress = nextConveyor ? this.resolveProgress(nextConveyor, side) : null;

    for (const index of CONVEYOR_SLOT_INDICES_DESC) {
      const entityId = slots[index];

      if (entityId === null) {
        progress[index] = 0;
        continue;
      }

      progress[index] += progressDelta;

      if (progress[index] < 1) {
        continue;
      }

      if (index === 3) {
        this.transferToNextConveyor(
          world,
          entityId,
          nextConveyorEntityId,
          slots,
          progress,
          nextSlots,
          nextProgress,
        );
        continue;
      }

      const destinationIndex = this.computeIntraConveyorDestinationIndex(index);

      if (destinationIndex === undefined) {
        progress[index] = 1;
        continue;
      }

      if (slots[destinationIndex] !== null) {
        progress[index] = 1;
        continue;
      }

      slots[destinationIndex] = entityId;
      progress[destinationIndex] = progress[index] - 1;
      slots[index] = null;
      progress[index] = 0;
    }
  }

  private static syncLaneTransforms(
    world: UserWorld,
    conveyor: ConveyorBeltComponent,
    side: ConveyorSide,
  ): void {
    const slots = this.resolveSlots(conveyor, side);
    const progress = this.resolveProgress(conveyor, side);

    for (const index of CONVEYOR_SLOT_INDICES_ASC) {
      const entityId = slots[index];

      if (entityId === null) {
        progress[index] = 0;
        continue;
      }

      const transform = world.get(entityId, Transform2D);

      if (!transform) {
        continue;
      }

      BeltItemRailsUtility.resolvePositionInto(
        conveyor.variant,
        side,
        index,
        progress[index],
        SHARED_SLOT_POSITION,
      );

      transform.curr.pos.x = SHARED_SLOT_POSITION.x;
      transform.curr.pos.y = SHARED_SLOT_POSITION.y;
    }
  }

  private static computeIntraConveyorDestinationIndex(index: ConveyorSlotIndex): ConveyorSlotIndex | undefined {
    if (index === 0) {
      return 1;
    }

    if (index === 1) {
      return 2;
    }

    if (index === 2) {
      return 3;
    }

    return undefined;
  }

  private static transferToNextConveyor(
    world: UserWorld,
    entityId: EntityId,
    nextConveyorEntityId: EntityId | null,
    slots: ConveyorBeltComponent["left"],
    progress: ConveyorBeltComponent["leftProgress"],
    nextSlots: ConveyorBeltComponent["left"] | null,
    nextProgress: ConveyorBeltComponent["leftProgress"] | null,
  ): void {
    if (
      nextConveyorEntityId === null
      || nextSlots === null
      || nextProgress === null
      || nextSlots[0] !== null
    ) {
      progress[3] = 1;
      return;
    }

    nextSlots[0] = entityId;
    nextProgress[0] = progress[3] - 1;
    slots[3] = null;
    progress[3] = 0;
    world.add(entityId, new Parent(nextConveyorEntityId));
  }

  private static resolveSlots(
    conveyor: ConveyorBeltComponent,
    side: ConveyorSide,
  ): ConveyorBeltComponent["left"] {
    if (side === "left") {
      return conveyor.left;
    }

    return conveyor.right;
  }

  private static resolveProgress(
    conveyor: ConveyorBeltComponent,
    side: ConveyorSide,
  ): ConveyorBeltComponent["leftProgress"] {
    if (side === "left") {
      return conveyor.leftProgress;
    }

    return conveyor.rightProgress;
  }

  private static resolveTraversalNextEntityId(
    world: UserWorld,
    leafEntityId: EntityId,
  ): EntityId | null {
    const leafConveyor = world.get(leafEntityId, ConveyorBeltComponent);

    if (!leafConveyor) {
      return null;
    }

    if (leafConveyor.previousEntityId === null) {
      return null;
    }

    return leafConveyor.nextEntityId;
  }
}
