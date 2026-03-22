/* eslint-disable @nx/enforce-module-boundaries */

import { describe, expect, it } from "vitest";

import { UserWorld, World } from "../../../engine/src/ecs/world";
import { Rectangle } from "../../../engine/src/math/geometry/rectangle";
import { Vec2 } from "../../../engine/src/math/vec/vec2";

import { ContextEntryRegion } from "./components/context-entry-region";
import { contextEntryRegionContainsPoint } from "./utilities";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

describe("contextEntryRegionContainsPoint", () => {
  it("accepts live Rectangle bounds", () => {
    const region = new ContextEntryRegion(
      "house" as never,
      new Rectangle(new Vec2(-10, -10), new Vec2(20, 20)),
    );

    expect(contextEntryRegionContainsPoint(region, new Vec2(0, 0))).toBe(true);
    expect(contextEntryRegionContainsPoint(region, new Vec2(20, 20))).toBe(false);
  });

  it("accepts JSON-serialized Rectangle bounds after component hydration", () => {
    const world = new UserWorld(new World("scene"));
    const entityId = world.create();
    const region = new ContextEntryRegion(
      "house" as never,
      new Rectangle(new Vec2(-10, -10), new Vec2(20, 20)),
    );

    world.add(entityId, region);

    const hydratedRegion = world.require(entityId, ContextEntryRegion);
    hydratedRegion.bounds = {
      position: { x: -10, y: -10 },
      size: { x: 20, y: 20 },
    } as never;

    expect(contextEntryRegionContainsPoint(hydratedRegion, new Vec2(0, 0))).toBe(true);
    expect(contextEntryRegionContainsPoint(hydratedRegion, new Vec2(20, 20))).toBe(false);
  });
});