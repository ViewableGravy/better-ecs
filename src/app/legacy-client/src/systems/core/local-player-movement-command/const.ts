import type { MovementCommand } from "@libs/commands/movement";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/

export type LocalPlayerMovementCommandState = {
  commands: MovementCommand[];
};

export const localPlayerMovementCommandStateDefault: LocalPlayerMovementCommandState = {
  commands: [],
};