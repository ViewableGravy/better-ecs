import { ConveyorBeltComponent, type ConveyorSide } from "@legacy/components/conveyor-belt";

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

  slots[index] = entityId;
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
