import { ConveyorUtils } from "@client/entities/transport-belt/utils/general";
import { Vec2 } from "@engine";
import { describe, expect, it } from "vitest";

describe("ConveyorUtils.resolveAnimatedSlotLocalPositionInto", () => {
  it("uses the configured half-step span between adjacent straight-belt slots", () => {
    const out = new Vec2();

    ConveyorUtils.resolveAnimatedSlotLocalPositionInto("horizontal-right", "left", 0, 0, out);
    expect(out.x).toBe(-10);
    expect(out.y).toBe(-4);

    ConveyorUtils.resolveAnimatedSlotLocalPositionInto("horizontal-right", "left", 0, 1, out);
    expect(out.x).toBe(-5);
    expect(out.y).toBe(-4);

    ConveyorUtils.resolveAnimatedSlotLocalPositionInto("horizontal-right", "left", 1, 0, out);
    expect(out.x).toBe(-5);
    expect(out.y).toBe(-4);

    ConveyorUtils.resolveAnimatedSlotLocalPositionInto("horizontal-right", "left", 1, 1, out);
    expect(out.x).toBe(0);
    expect(out.y).toBe(-4);
  });
});
