/* eslint-disable @nx/enforce-module-boundaries */
import { describe, expect, it } from "vitest";

import { Transform2D } from "../../../../engine/src/components/transform";
import { Vec2 } from "../../../../engine/src/math/vec/vec2";

import { CircleCollider } from "../colliders/circle";
import { RectangleCollider } from "../colliders/rectangle";
import { resolveCircleVsRect } from "./circle-rect";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

describe("physics collision interpolation", () => {
  it("keeps prev aligned with curr when collision resolution applies a vertical correction", () => {
    const subjectTransform = new Transform2D(0, 0, 0);
    const subjectCollider = new CircleCollider(3);
    const otherTransform = new Transform2D(0, 0, 0);
    const otherCollider = new RectangleCollider(new Vec2(-10, -1), new Vec2(20, 2));

    resolveCircleVsRect(subjectCollider, subjectTransform, otherCollider, otherTransform);

    expect(subjectTransform.prev.pos.x).toBe(subjectTransform.curr.pos.x);
    expect(subjectTransform.prev.pos.y).toBe(subjectTransform.curr.pos.y);
  });
});