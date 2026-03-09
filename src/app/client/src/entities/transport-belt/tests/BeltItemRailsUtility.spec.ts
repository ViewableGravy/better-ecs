import { BeltItemRailsUtility } from "@client/entities/transport-belt/motion/BeltItemRailsUtility";
import { Vec2 } from "@engine";
import { describe, expect, it } from "vitest";

describe("BeltItemRailsUtility.resolvePositionInto", () => {
  it("resolves straight-belt rail positions from edge to edge", () => {
    const out = new Vec2();

    BeltItemRailsUtility.resolvePositionInto("horizontal-right", "left", 0, 0, out);
    expect(out.x).toBe(-10);
    expect(out.y).toBe(-4);

    BeltItemRailsUtility.resolvePositionInto("horizontal-right", "left", 0, 0.5, out);
    expect(out.x).toBe(-7.5);
    expect(out.y).toBe(-4);

    BeltItemRailsUtility.resolvePositionInto("horizontal-right", "left", 3, 1, out);
    expect(out.x).toBe(10);
    expect(out.y).toBe(-4);
  });

  it("follows the outer curved rail for a right-to-up turn", () => {
    const out = new Vec2();

    BeltItemRailsUtility.resolvePositionInto("angled-right-up", "left", 0, 0, out);
    expect(out.x).toBe(10);
    expect(out.y).toBeCloseTo(4, 4);

    BeltItemRailsUtility.resolvePositionInto("angled-right-up", "left", 0, 0.5, out);
    expect(out.x).toBeCloseTo(7.2687, 4);
    expect(out.y).toBeCloseTo(3.731, 4);

    BeltItemRailsUtility.resolvePositionInto("angled-right-up", "left", 3, 1, out);
    expect(out.x).toBeCloseTo(-4, 4);
    expect(out.y).toBeCloseTo(-10, 4);
  });

  it("follows the inner curved rail for a right-to-up turn", () => {
    const out = new Vec2();

    BeltItemRailsUtility.resolvePositionInto("angled-right-up", "right", 0, 0, out);
    expect(out.x).toBe(10);
    expect(out.y).toBeCloseTo(-4, 4);

    BeltItemRailsUtility.resolvePositionInto("angled-right-up", "right", 0, 0.5, out);
    expect(out.x).toBeCloseTo(8.8295, 4);
    expect(out.y).toBeCloseTo(-4.1153, 4);

    BeltItemRailsUtility.resolvePositionInto("angled-right-up", "right", 3, 1, out);
    expect(out.x).toBeCloseTo(4, 4);
    expect(out.y).toBeCloseTo(-10, 4);
  });
});
