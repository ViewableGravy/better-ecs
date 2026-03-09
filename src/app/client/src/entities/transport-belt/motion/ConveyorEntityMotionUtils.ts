import { ConveyorBeltComponent, type ConveyorSide, type ConveyorSlotIndex } from "@client/components/conveyor-belt";
import {
    getConveyorLaneProgress,
    getConveyorLaneSlots,
    isConveyorLaneTailBlocked,
    setConveyorLaneTailBlocked,
} from "@client/entities/transport-belt/core";
import { BeltItemRailsUtility } from "@client/entities/transport-belt/motion/BeltItemRailsUtility";
import {
    CONVEYOR_SIDES,
    CONVEYOR_SLOT_COUNT_PER_LANE,
    CONVEYOR_SLOT_INDICES_ASC,
    CONVEYOR_SLOT_INDICES_DESC,
    getSlotAdvanceDurations,
    SHARED_SLOT_POSITION,
} from "@client/entities/transport-belt/motion/constants";
import type { ConveyorSideLoadTransfer } from "@client/entities/transport-belt/motion/types";
import type { EntityId, UserWorld } from "@engine";
import { Parent, Transform2D } from "@engine/components";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/

type SideLoadDestinationSlotIndex = 1 | 2;

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export class ConveyorEntityMotionUtils {
  private world: UserWorld | null = null;
  private updateDelta = 0;
  private nextConveyorEntityId: EntityId | null = null;

  public set(
    world: UserWorld,
    updateDelta: number,
    initialNextConveyorEntityId: EntityId | null,
  ): void {
    this.world = world;
    this.updateDelta = updateDelta;
    this.nextConveyorEntityId = initialNextConveyorEntityId;
  }

  public advanceConveyorEntity(conveyorEntityId: EntityId): void {
    if (this.world === null) {
      return;
    }

    const conveyor = this.world.get(conveyorEntityId, ConveyorBeltComponent);

    if (!conveyor) {
      return;
    }

    const nextConveyor = this.nextConveyorEntityId === null
      ? null
      : this.world.get(this.nextConveyorEntityId, ConveyorBeltComponent) ?? null;

    ConveyorEntityMotionUtils.advanceConveyor(
      this.world,
      conveyor,
      this.nextConveyorEntityId,
      nextConveyor,
      this.updateDelta,
    );

    this.nextConveyorEntityId = conveyorEntityId;
  }

  public syncConveyorEntityTransforms(conveyorEntityId: EntityId): void {
    if (this.world === null) {
      return;
    }

    const conveyor = this.world.get(conveyorEntityId, ConveyorBeltComponent);

    if (!conveyor) {
      return;
    }

    ConveyorEntityMotionUtils.syncConveyorTransforms(this.world, conveyor);
  }

  public static advanceConveyor(
    world: UserWorld,
    conveyor: ConveyorBeltComponent,
    nextConveyorEntityId: EntityId | null,
    nextConveyor: ConveyorBeltComponent | null,
    updateDelta: number,
  ): void {
    const [leftAdvanceDuration, rightAdvanceDuration] = getSlotAdvanceDurations(conveyor.variant);

    this.advanceLane(
      world,
      conveyor,
      nextConveyorEntityId,
      nextConveyor,
      "left",
      updateDelta * CONVEYOR_SLOT_COUNT_PER_LANE / leftAdvanceDuration,
    );

    this.advanceLane(
      world,
      conveyor,
      nextConveyorEntityId,
      nextConveyor,
      "right",
      updateDelta * CONVEYOR_SLOT_COUNT_PER_LANE / rightAdvanceDuration,
    );
  }

  public static syncConveyorTransforms(world: UserWorld, conveyor: ConveyorBeltComponent): void {
    for (const side of CONVEYOR_SIDES) {
      this.syncLaneTransforms(world, conveyor, side);
    }
  }

  public static transferSideLoad(world: UserWorld, transfer: ConveyorSideLoadTransfer): boolean {
    const sourceConveyor = world.get(transfer.sourceEntityId, ConveyorBeltComponent);
    const targetConveyor = world.get(transfer.targetEntityId, ConveyorBeltComponent);

    if (!sourceConveyor || !targetConveyor) {
      return false;
    }

    const didTransferLeftLane = this.transferSideLoadLane(
      world,
      sourceConveyor,
      "left",
      transfer.targetEntityId,
      targetConveyor,
      transfer.targetLane,
      1,
    );
    const didTransferRightLane = this.transferSideLoadLane(
      world,
      sourceConveyor,
      "right",
      transfer.targetEntityId,
      targetConveyor,
      transfer.targetLane,
      2,
    );

    return didTransferLeftLane || didTransferRightLane;
  }

  private static advanceLane(
    world: UserWorld,
    conveyor: ConveyorBeltComponent,
    nextConveyorEntityId: EntityId | null,
    nextConveyor: ConveyorBeltComponent | null,
    side: ConveyorSide,
    progressDelta: number,
  ): void {
    const slots = getConveyorLaneSlots(conveyor, side);
    const progress = getConveyorLaneProgress(conveyor, side);
    const nextSlots = nextConveyor ? getConveyorLaneSlots(nextConveyor, side) : null;
    const nextProgress = nextConveyor ? getConveyorLaneProgress(nextConveyor, side) : null;

    for (const index of CONVEYOR_SLOT_INDICES_DESC) {
      const entityId = slots[index];

      if (entityId === null) {
        progress[index] = 0;

        if (index === 3) {
          setConveyorLaneTailBlocked(conveyor, side, false);
        }

        continue;
      }

      progress[index] += progressDelta;

      if (progress[index] < 1) {
        if (index === 3) {
          setConveyorLaneTailBlocked(conveyor, side, false);
        }

        continue;
      }

      if (index === 3) {
        this.transferToNextConveyor(
          world,
          conveyor,
          side,
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

      if (destinationIndex === 3) {
        setConveyorLaneTailBlocked(conveyor, side, false);
      }

      slots[index] = null;
      progress[index] = 0;
    }
  }

  private static syncLaneTransforms(world: UserWorld, conveyor: ConveyorBeltComponent, side: ConveyorSide): void {
    const slots = getConveyorLaneSlots(conveyor, side);
    const progress = getConveyorLaneProgress(conveyor, side);

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
    conveyor: ConveyorBeltComponent,
    side: ConveyorSide,
    entityId: EntityId,
    nextConveyorEntityId: EntityId | null,
    slots: ConveyorBeltComponent["left"],
    progress: ConveyorBeltComponent["leftProgress"],
    nextSlots: ConveyorBeltComponent["left"] | null,
    nextProgress: ConveyorBeltComponent["leftProgress"] | null,
  ): void {
    if (nextConveyorEntityId === null
      || nextSlots === null
      || nextProgress === null
      || nextSlots[0] !== null) {
      progress[3] = 1;
      setConveyorLaneTailBlocked(conveyor, side, true);
      return;
    }

    const shouldResetTransferredProgress = isConveyorLaneTailBlocked(conveyor, side);

    nextSlots[0] = entityId;
    nextProgress[0] = shouldResetTransferredProgress ? 0 : progress[3] - 1;
    slots[3] = null;
    progress[3] = 0;
    setConveyorLaneTailBlocked(conveyor, side, false);
    world.add(entityId, new Parent(nextConveyorEntityId));
  }

  private static transferSideLoadLane(
    world: UserWorld,
    sourceConveyor: ConveyorBeltComponent,
    sourceLane: ConveyorSide,
    targetConveyorEntityId: EntityId,
    targetConveyor: ConveyorBeltComponent,
    targetLane: ConveyorSide,
    destinationIndex: SideLoadDestinationSlotIndex,
  ): boolean {
    const sourceSlots = getConveyorLaneSlots(sourceConveyor, sourceLane);
    const sourceProgress = getConveyorLaneProgress(sourceConveyor, sourceLane);
    const sourceEntityId = sourceSlots[3];

    if (sourceEntityId === null || sourceProgress[3] < 1) {
      return false;
    }

    const targetSlots = getConveyorLaneSlots(targetConveyor, targetLane);
    const targetProgress = getConveyorLaneProgress(targetConveyor, targetLane);

    if (targetSlots[destinationIndex] !== null) {
      sourceProgress[3] = 1;
      setConveyorLaneTailBlocked(sourceConveyor, sourceLane, true);
      return false;
    }

    targetSlots[destinationIndex] = sourceEntityId;
    targetProgress[destinationIndex] = 0;
    sourceSlots[3] = null;
    sourceProgress[3] = 0;
    setConveyorLaneTailBlocked(sourceConveyor, sourceLane, false);
    world.add(sourceEntityId, new Parent(targetConveyorEntityId));

    return true;
  }
}
