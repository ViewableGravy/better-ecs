import type { MovementCommand } from "@libs/commands/movement";
import type { LocalPlayerMovementCommandState } from "@server/scenes/demo/systems/movement-command";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export function replaceMovementCommands(
  movementState: LocalPlayerMovementCommandState,
  commands: readonly MovementCommand[],
): void {
  movementState.commands = [...commands];
}