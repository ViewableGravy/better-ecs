import type { PlayerDirection } from "@client/components/player";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/

export type MovementAxis = -1 | 0 | 1;

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

function resolveAxis(isNegativeActive: boolean, isPositiveActive: boolean): MovementAxis {
  if (isNegativeActive === isPositiveActive) {
    return 0;
  }

  return isPositiveActive ? 1 : -1;
}