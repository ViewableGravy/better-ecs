import type { PlayerDirection } from "@client/components/player";
import type { MovementAxis, MovementCommand } from "@libs/commands/movement";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/

export type MovementAxes = {
  x: MovementAxis;
  y: MovementAxis;
};

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export function resolveMovementAxes(keysActive: Set<string>): MovementAxes {
  return {
    x: resolveAxis(
      keysActive.has("ArrowLeft") || keysActive.has("KeyA"),
      keysActive.has("ArrowRight") || keysActive.has("KeyD"),
    ),
    y: resolveAxis(
      keysActive.has("ArrowUp") || keysActive.has("KeyW"),
      keysActive.has("ArrowDown") || keysActive.has("KeyS"),
    ),
  };
}

export function resolveDirectionFromAxes(x: MovementAxis, y: MovementAxis): PlayerDirection | undefined {
  if (x === 0 && y === -1) return "n";
  if (x === 1 && y === -1) return "ne";
  if (x === 1 && y === 0) return "e";
  if (x === 1 && y === 1) return "se";
  if (x === 0 && y === 1) return "s";
  if (x === -1 && y === 1) return "sw";
  if (x === -1 && y === 0) return "w";
  if (x === -1 && y === -1) return "nw";

  return undefined;
}

export function resolveMovementAxesFromCommands(commands: readonly MovementCommand[]): MovementAxes {
  for (let index = commands.length - 1; index >= 0; index -= 1) {
    const command = commands[index];

    if (command.type !== "movement:move") {
      continue;
    }

    return {
      x: command.x,
      y: command.y,
    };
  }

  return {
    x: 0,
    y: 0,
  };
}

function resolveAxis(isNegativeActive: boolean, isPositiveActive: boolean): MovementAxis {
  if (isNegativeActive === isPositiveActive) {
    return 0;
  }

  return isPositiveActive ? 1 : -1;
}