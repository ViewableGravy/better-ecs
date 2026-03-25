import { ConveyorBeltComponent, type ConveyorSide } from "@client/components/conveyor-belt";
import { mutate } from "@engine";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export function getConveyorLaneSlots(
  conveyor: ConveyorBeltComponent,
  side: ConveyorSide,
): ConveyorBeltComponent["left"] {
  if (side === "left") {
    return conveyor.left;
  }

  return conveyor.right;
}

export function getConveyorLaneProgress(
  conveyor: ConveyorBeltComponent,
  side: ConveyorSide,
): ConveyorBeltComponent["leftProgress"] {
  if (side === "left") {
    return conveyor.leftProgress;
  }

  return conveyor.rightProgress;
}

function getConveyorLaneSlotsFieldKey(side: ConveyorSide): "left" | "right" {
  if (side === "left") {
    return "left";
  }

  return "right";
}

export function setConveyorLaneSlot(
  conveyor: ConveyorBeltComponent,
  side: ConveyorSide,
  index: number,
  entityId: ConveyorBeltComponent["left"][number],
): void {
  const slots = getConveyorLaneSlots(conveyor, side);

  if (slots[index] === entityId) {
    return;
  }

  mutate(conveyor, getConveyorLaneSlotsFieldKey(side), (trackedSlots) => {
    trackedSlots[index] = entityId;
  });
}

export function setConveyorLaneStoredProgress(
  conveyor: ConveyorBeltComponent,
  side: ConveyorSide,
  index: number,
  value: number,
): void {
  const progress = getConveyorLaneProgress(conveyor, side);

  if (progress[index] === value) {
    return;
  }

  progress[index] = value;
}

export function isConveyorLaneTailBlocked(
  conveyor: ConveyorBeltComponent,
  side: ConveyorSide,
): boolean {
  if (side === "left") {
    return conveyor.leftTailBlocked;
  }

  return conveyor.rightTailBlocked;
}

export function setConveyorLaneTailBlocked(
  conveyor: ConveyorBeltComponent,
  side: ConveyorSide,
  blocked: boolean,
): void {
  if (side === "left") {
    conveyor.leftTailBlocked = blocked;
    return;
  }

  conveyor.rightTailBlocked = blocked;
}
