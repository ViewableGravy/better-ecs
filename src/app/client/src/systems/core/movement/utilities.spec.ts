import { describe, expect, it } from "vitest";

import { resolveDirectionFromAxes, resolveMovementAxes } from "@client/systems/core/movement/utilities";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

describe("movement utilities", () => {
  it("derives axes from the local movement keys", () => {
    expect(resolveMovementAxes(new Set(["KeyD", "KeyW"]))).toEqual({ x: 1, y: -1 });
    expect(resolveMovementAxes(new Set(["ArrowLeft", "ArrowRight"]))).toEqual({ x: 0, y: 0 });
    expect(resolveMovementAxes(new Set(["KeyS"]))).toEqual({ x: 0, y: 1 });
  });

  it("maps axes to player facing directions", () => {
    expect(resolveDirectionFromAxes(0, -1)).toBe("n");
    expect(resolveDirectionFromAxes(1, 0)).toBe("e");
    expect(resolveDirectionFromAxes(-1, 1)).toBe("sw");
    expect(resolveDirectionFromAxes(0, 0)).toBeUndefined();
  });
});