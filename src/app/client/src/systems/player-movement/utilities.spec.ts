import {
  deriveDirection,
  deriveMovementAxes,
  deriveMovementScale,
} from "@client/systems/player-movement/utilities";
import { describe, expect, it } from "vitest";

describe("player movement utilities", () => {
  it("derives movement axes from keyboard state", () => {
    expect(deriveMovementAxes(new Set(["KeyD", "KeyW"]))).toEqual({ x: 1, y: -1 });
    expect(deriveMovementAxes(new Set(["ArrowLeft", "ArrowRight"]))).toEqual({ x: 0, y: 0 });
  });

  it("maps axes to the eight player directions", () => {
    expect(deriveDirection(0, -1)).toBe("n");
    expect(deriveDirection(1, -1)).toBe("ne");
    expect(deriveDirection(-1, 1)).toBe("sw");
    expect(deriveDirection(0, 0)).toBeUndefined();
  });

  it("normalizes diagonal movement speed", () => {
    expect(deriveMovementScale(1, 0)).toBe(1);
    expect(deriveMovementScale(1, -1)).toBe(Math.SQRT1_2);
  });
});
