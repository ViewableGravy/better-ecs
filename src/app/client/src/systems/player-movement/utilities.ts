import type { PlayerDirection } from "@client/components/player";

export type MovementAxis = -1 | 0 | 1;
export type MovementAxes = { x: MovementAxis; y: MovementAxis };

export function deriveMovementAxes(keysActive: ReadonlySet<string>): MovementAxes {
  return {
    x: deriveAxis(
      keysActive.has("ArrowLeft") || keysActive.has("KeyA"),
      keysActive.has("ArrowRight") || keysActive.has("KeyD"),
    ),
    y: deriveAxis(
      keysActive.has("ArrowUp") || keysActive.has("KeyW"),
      keysActive.has("ArrowDown") || keysActive.has("KeyS"),
    ),
  };
}

export function deriveDirection(x: MovementAxis, y: MovementAxis): PlayerDirection | undefined {
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

export function deriveMovementScale(x: MovementAxis, y: MovementAxis): number {
  return x !== 0 && y !== 0 ? Math.SQRT1_2 : 1;
}

function deriveAxis(negativeActive: boolean, positiveActive: boolean): MovementAxis {
  if (negativeActive === positiveActive) {
    return 0;
  }

  return positiveActive ? 1 : -1;
}
