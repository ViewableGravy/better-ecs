import { type ConveyorBeltComponent, type ConveyorSide } from "@client/components/conveyor-belt";

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

export function isConveyorLaneTailBlocked(conveyor: ConveyorBeltComponent, side: ConveyorSide): boolean {
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
