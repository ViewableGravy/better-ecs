import type { Transform2D } from "@repo/engine/components";
import { CircleCollider } from "../colliders/circle";
import { RectangleCollider } from "../colliders/rectangle";
import type { PrimitiveCollider } from "../types";
import { clamp, getRectangleBounds } from "../utils";

export function circleVsRect(
  a: PrimitiveCollider,
  aTransform: Transform2D,
  b: PrimitiveCollider,
  bTransform: Transform2D,
): boolean {
  if (!(a instanceof CircleCollider)) {
    return false;
  }

  if (!(b instanceof RectangleCollider)) {
    return false;
  }

  const bounds = getRectangleBounds(b, bTransform);
  const centerX = aTransform.curr.pos.x;
  const centerY = aTransform.curr.pos.y;
  const closestX = clamp(centerX, bounds.left, bounds.right);
  const closestY = clamp(centerY, bounds.top, bounds.bottom);
  const dx = centerX - closestX;
  const dy = centerY - closestY;

  return dx * dx + dy * dy < a.radius * a.radius;
}
