import type { MovementAxes } from "@client/systems/core/movement/utilities";
import type { MovementCommand } from "@libs/commands/movement";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export function emitMovementCommands(commands: MovementCommand[], movementAxes: MovementAxes): void {
  if (movementAxes.x === 0 && movementAxes.y === 0) {
    return;
  }

  commands.push({
    type: "movement:move",
    x: movementAxes.x,
    y: movementAxes.y,
  });
}