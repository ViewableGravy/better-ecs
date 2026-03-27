import { createSystem } from "@engine";
import type { MovementCommand } from "@libs/commands/movement";

export type LocalPlayerMovementCommandState = {
  commands: MovementCommand[];
};

export const MOVEMENT_COMMAND_SYSTEM_NAME = "main:local-player-movement-command";

const defaultMovementCommandState: LocalPlayerMovementCommandState = {
  commands: [],
};

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export const System = createSystem(MOVEMENT_COMMAND_SYSTEM_NAME)({
  state: defaultMovementCommandState,
  system() {
    return;
  },
});