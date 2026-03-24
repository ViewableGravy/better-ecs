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
    CONVEYOR_SLOT_INDICES_ASC,
    CONVEYOR_SLOT_INDICES_DESC,
    getSlotAdvanceTicks,
    SHARED_SLOT_POSITION,
} from "@client/entities/transport-belt/motion/constants";
import type { ConveyorSideLoadTransfer } from "@client/entities/transport-belt/motion/types";
import type { EntityId, UserWorld } from "@engine";
import { Parent, Transform2D } from "@engine/components";
import { resolveWorldTransform2D } from "@engine/ecs/hierarchy";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/

type SideLoadDestinationSlotIndex = 1 | 2;

const SHARED_PREVIOUS_PARENT_WORLD_TRANSFORM = new Transform2D();
const SHARED_NEXT_PARENT_WORLD_TRANSFORM = new Transform2D();
const PROGRESS_SEAM_EPSILON = 1e-9;
const MAX_PROGRESS_WITHIN_SLOT = 1 - PROGRESS_SEAM_EPSILON;

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export class ConveyorEntityMotionUtils {
  private world: UserWorld | null = null;
  private tickDelta = 0;
  private nextConveyorEntityId: EntityId | null = null;

  public set(
    world: UserWorld,
    tickDelta: number,
    initialNextConveyorEntityId: EntityId | null,
  ): void {
    this.world = world;
    this.tickDelta = tickDelta;
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
      nextConveyor,
      this.tickDelta,
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
    nextConveyor: ConveyorBeltComponent | null,
    tickDelta: number,
  ): void {
    const [leftAdvanceTicks, rightAdvanceTicks] = getSlotAdvanceTicks(conveyor.variant);

    this.advanceLane(
      world,
      conveyor,
      nextConveyor,
      "left",
      tickDelta / leftAdvanceTicks,
    );

    this.advanceLane(
      world,
      conveyor,
      nextConveyor,
      "right",
      tickDelta / rightAdvanceTicks,
    );
  }

  public static syncConveyorTransforms(
    world: UserWorld,
    conveyor: ConveyorBeltComponent,
  ): void {
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
      transfer.sourceEntityId,
      sourceConveyor,
      "left",
      transfer.targetEntityId,
      targetConveyor,
      transfer.targetLane,
      1,
    );
    const didTransferRightLane = this.transferSideLoadLane(
      world,
      transfer.sourceEntityId,
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
    nextConveyor: ConveyorBeltComponent | null,
    side: ConveyorSide,
    progressDelta: number,
  ): void {
    const slots = getConveyorLaneSlots(conveyor, side);
    const progress = getConveyorLaneProgress(conveyor, side);
    const nextSlots = nextConveyor ? getConveyorLaneSlots(nextConveyor, side) : null;
    const nextProgress = nextConveyor
      ? getConveyorLaneProgress(nextConveyor, side)
      : null;

    for (const index of CONVEYOR_SLOT_INDICES_DESC) {
      this.advanceLaneEntity(
        world,
        conveyor,
        nextConveyor,
        side,
        index,
        progressDelta,
        slots,
        progress,
        nextSlots,
        nextProgress,
      );
    }
  }

  private static advanceLaneEntity(
    world: UserWorld,
    conveyor: ConveyorBeltComponent,
    nextConveyor: ConveyorBeltComponent | null,
    side: ConveyorSide,
    startIndex: ConveyorSlotIndex,
    progressDelta: number,
    slots: ConveyorBeltComponent["left"],
    progress: ConveyorBeltComponent["leftProgress"],
    nextSlots: ConveyorBeltComponent["left"] | null,
    nextProgress: ConveyorBeltComponent["leftProgress"] | null,
  ): void {
    const entityId = slots[startIndex];

    if (entityId === null) {
      progress[startIndex] = 0;

      if (startIndex === 3) {
        setConveyorLaneTailBlocked(conveyor, side, false);
      }

      return;
    }

    let currentIndex = startIndex;
    const hadQueuedAdvance = progress[currentIndex] >= 1;

    if (hadQueuedAdvance) {
      if (currentIndex === 3) {
        this.transferToNextConveyor(
          world,
          conveyor,
          nextConveyor,
          side,
          entityId,
          slots,
          progress,
          nextSlots,
          nextProgress,
          1 + progressDelta,
        );

        return;
      }

      const queuedDestinationIndex = this.computeIntraConveyorDestinationIndex(currentIndex);

      if (queuedDestinationIndex === undefined) {
        progress[currentIndex] = 1;
        return;
      }

      if (slots[queuedDestinationIndex] !== null) {
        progress[currentIndex] = 1;
        return;
      }

      slots[queuedDestinationIndex] = entityId;
      slots[currentIndex] = null;
      progress[currentIndex] = 0;
      currentIndex = queuedDestinationIndex;
    }

    let remainingProgress = hadQueuedAdvance ? progressDelta : progress[currentIndex] + progressDelta;

    while (hadQueuedAdvance ? remainingProgress > 1 : remainingProgress >= 1) {
      if (currentIndex === 3) {
        this.transferToNextConveyor(
          world,
          conveyor,
          nextConveyor,
          side,
          entityId,
          slots,
          progress,
          nextSlots,
          nextProgress,
          remainingProgress,
        );

        return;
      }

      const destinationIndex = this.computeIntraConveyorDestinationIndex(currentIndex);

      if (destinationIndex === undefined) {
        progress[currentIndex] = 1;
        return;
      }

      if (slots[destinationIndex] !== null) {
        progress[currentIndex] = 1;
        return;
      }

      slots[destinationIndex] = entityId;
      slots[currentIndex] = null;
      progress[currentIndex] = 0;

      remainingProgress -= 1;
      currentIndex = destinationIndex;
      progress[currentIndex] = 0;

      if (currentIndex === 3) {
        setConveyorLaneTailBlocked(conveyor, side, false);
      }
    }

    progress[currentIndex] = this.normalizeStoredProgress(remainingProgress);

    if (currentIndex === 3) {
      setConveyorLaneTailBlocked(conveyor, side, false);
    }
  }

  private static normalizeStoredProgress(value: number): number {
    if (value >= MAX_PROGRESS_WITHIN_SLOT) {
      return 1;
    }

    return value;
  }

  private static syncLaneTransforms(
    world: UserWorld,
    conveyor: ConveyorBeltComponent,
    side: ConveyorSide,
  ): void {
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
    nextConveyor: ConveyorBeltComponent | null,
    side: ConveyorSide,
    entityId: EntityId,
    slots: ConveyorBeltComponent["left"],
    progress: ConveyorBeltComponent["leftProgress"],
    nextSlots: ConveyorBeltComponent["left"] | null,
    nextProgress: ConveyorBeltComponent["leftProgress"] | null,
    remainingProgress: number,
  ): void {
    const nextConveyorEntityId = nextConveyor?.attachedEntityId;

    if (nextConveyorEntityId === null
      || nextConveyorEntityId === undefined
      || nextSlots === null
      || nextProgress === null
      || nextSlots[0] !== null) {
      progress[3] = 1;
      setConveyorLaneTailBlocked(conveyor, side, true);
      return;
    }

    const shouldResetTransferredProgress = isConveyorLaneTailBlocked(conveyor, side);
    const transferredProgress = shouldResetTransferredProgress
      ? 0
      : this.normalizeStoredProgress(Math.min(remainingProgress - 1, 1));

    nextSlots[0] = entityId;
    nextProgress[0] = transferredProgress;
    slots[3] = null;
    progress[3] = 0;
    setConveyorLaneTailBlocked(conveyor, side, false);
    this.syncParent(world, entityId, nextConveyorEntityId);
  }

  private static transferSideLoadLane(
    world: UserWorld,
    sourceConveyorEntityId: EntityId,
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
    targetProgress[destinationIndex] = 0.5;
    sourceSlots[3] = null;
    sourceProgress[3] = 0;
    setConveyorLaneTailBlocked(sourceConveyor, sourceLane, false);
    this.syncParent(world, sourceEntityId, targetConveyorEntityId);

    return true;
  }

  private static syncParent(world: UserWorld, entityId: EntityId, parentEntityId: EntityId): void {
    const transform = world.get(entityId, Transform2D);
    const parent = world.get(entityId, Parent);

    if (transform && parent && parent.entityId !== parentEntityId) {
      this.preservePreviousWorldPosition(world, transform, parent.entityId, parentEntityId);
    }

    if (!parent) {
      world.add(entityId, new Parent(parentEntityId));
      return;
    }

    parent.entityId = parentEntityId;
  }

  private static preservePreviousWorldPosition(
    world: UserWorld,
    transform: Transform2D,
    previousParentEntityId: EntityId,
    nextParentEntityId: EntityId,
  ): void {
    const resolvedPreviousParent = resolveWorldTransform2D(
      world,
      previousParentEntityId,
      SHARED_PREVIOUS_PARENT_WORLD_TRANSFORM,
    );
    const resolvedNextParent = resolveWorldTransform2D(
      world,
      nextParentEntityId,
      SHARED_NEXT_PARENT_WORLD_TRANSFORM,
    );

    if (!resolvedNextParent) {
      return;
    }

    let previousWorldPrevX = transform.prev.pos.x;
    let previousWorldPrevY = transform.prev.pos.y;

    if (resolvedPreviousParent) {
      previousWorldPrevX += SHARED_PREVIOUS_PARENT_WORLD_TRANSFORM.prev.pos.x;
      previousWorldPrevY += SHARED_PREVIOUS_PARENT_WORLD_TRANSFORM.prev.pos.y;
    }

    transform.prev.pos.x = previousWorldPrevX - SHARED_NEXT_PARENT_WORLD_TRANSFORM.prev.pos.x;
    transform.prev.pos.y = previousWorldPrevY - SHARED_NEXT_PARENT_WORLD_TRANSFORM.prev.pos.y;
  }
}
