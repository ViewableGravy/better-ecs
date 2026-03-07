import {
  type ConveyorBeltComponent,
  type ConveyorSide,
  type ConveyorSlotIndex,
} from "@client/components/conveyor-belt";
import { ConveyorUtils } from "@client/entities/transport-belt/conveyor-utils";
import {
  CONVEYOR_SIDES,
  CONVEYOR_SLOT_INDICES_ASC,
  CONVEYOR_SLOT_INDICES_DESC,
  SHARED_SLOT_POSITION,
  WRAP_LAST_SLOT_TO_START,
} from "@client/systems/world/conveyor-entity-motion/constants";
import type { UserWorld } from "@engine";
import { Transform2D } from "@engine/components";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/
export class ConveyorEntityMotionUtils {
  /**
   * Advances the entities on a conveyor belt based on the belt's speed and the elapsed time since the last update, 
   * and syncs their transforms to match their expected positions on the conveyor's animation.
   * 
   * @param world The world containing the entities to advance.
   * @param conveyor The conveyor belt component containing the entities.
   * @param progressDelta The amount to advance the progress of each entity on the conveyor, typically computed as `speed * deltaTime`.
   */
  public static advanceConveyor(
    world: UserWorld,
    conveyor: ConveyorBeltComponent,
    progressDelta: number,
  ): void {
    for (const side of CONVEYOR_SIDES) {
      this.advanceLane(conveyor, side, progressDelta);
      this.syncLaneTransforms(world, conveyor, side);
    }
  }

  /**
   * Advances the entities in a single lane of the conveyor belt.
   * 
   * @param conveyor The conveyor belt to advance entities on.
   * @param side The side of the conveyor belt to advance entities on.
   * @param progressDelta The amount to advance the progress of each entity on the lane, typically computed as `speed * deltaTime`.
   */
  private static advanceLane(
    conveyor: ConveyorBeltComponent,
    side: ConveyorSide,
    progressDelta: number,
  ): void {
    const slots = side === "left" 
      ? conveyor.left 
      : conveyor.right;
    const progress = side === "left" 
      ? conveyor.leftProgress 
      : conveyor.rightProgress;

    // iterate from end first, this allows us to ensure that entities are moved into their
    // new slots before attempting to move entities into their slots from earlier slots.
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

      const destinationIndex = this.computeDestinationIndex(index);

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

  /**
   * Syncs the transforms of all entities on a conveyor lane to match their expected positions based on the conveyor's animation.
   * 
   * @param world The world containing the entities to sync.
   * @param conveyor The conveyor belt component containing the entities.
   * @param side The side of the conveyor belt to sync entities on.
   */
  private static syncLaneTransforms(
    world: UserWorld,
    conveyor: ConveyorBeltComponent,
    side: ConveyorSide,
  ): void {
    const slots = side === "left" 
      ? conveyor.left 
      : conveyor.right;
    const progress = side === "left" 
      ? conveyor.leftProgress 
      : conveyor.rightProgress;

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

      ConveyorUtils.resolveAnimatedSlotLocalPositionInto(
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

  /**
   * Computes the destination index for an entity in a conveyor slot, returning undefined if the entity 
   * should not advance to a new slot.
   */
  private static computeDestinationIndex(index: ConveyorSlotIndex): ConveyorSlotIndex | undefined {
    if (index === 3) {
      if (!WRAP_LAST_SLOT_TO_START) {
        return undefined;
      }

      return 0;
    }

    return (index + 1) as ConveyorSlotIndex;
  }
}
