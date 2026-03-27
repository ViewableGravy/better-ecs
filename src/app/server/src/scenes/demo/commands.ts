import type { AnyEngine } from "@engine";
import type { MovementCommand, MovementMoveCommand } from "@libs/commands/movement";
import type { AuthoritativeCommandHandlers } from "@repo/networking";
import {
    MOVEMENT_COMMAND_SYSTEM_NAME,
    type LocalPlayerMovementCommandState,
} from "@server/scenes/demo/systems/movement-command";
import { replaceMovementCommands } from "@server/scenes/demo/systems/movement-command/utilities";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export const demoCommandHandlers: AuthoritativeCommandHandlers = {
  "movement:move": ({ engine, payload }) => {
    assertMovementMoveCommand(payload);

    const movementState = requireMovementCommandState(engine);

    replaceMovementCommands(movementState, [payload]);
  },
};

function requireMovementCommandState(engine: Pick<AnyEngine, "systems">): LocalPlayerMovementCommandState {
  const system = engine.systems[MOVEMENT_COMMAND_SYSTEM_NAME];

  if (!system || typeof system !== "object" || !("data" in system)) {
    throw new Error(`Expected server movement command system "${MOVEMENT_COMMAND_SYSTEM_NAME}" to exist.`);
  }

  return system.data as LocalPlayerMovementCommandState;
}

function assertMovementMoveCommand(payload: unknown): asserts payload is MovementMoveCommand {
  if (typeof payload !== "object" || payload === null) {
    throw new Error("Movement command payload must be an object.");
  }

  const candidate = payload as Partial<MovementCommand>;

  if (candidate.type !== "movement:move") {
    throw new Error('Movement command payload must have type "movement:move".');
  }

  if (!isMovementAxis(candidate.x) || !isMovementAxis(candidate.y)) {
    throw new Error("Movement command payload must contain x and y movement axes.");
  }
}

function isMovementAxis(value: unknown): value is -1 | 0 | 1 {
  return value === -1 || value === 0 || value === 1;
}