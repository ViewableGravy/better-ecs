import type { Transform2D } from "@repo/engine/components";
import { CircleCollider } from "../colliders/circle";
import type { PrimitiveCollider } from "../types";

export function circleVsCircle(
  a: PrimitiveCollider,
  aTransform: Transform2D,
  b: PrimitiveCollider,
  bTransform: Transform2D,
): boolean {
  if (!(a instanceof CircleCollider)) {
    return false;
  }

  if (!(b instanceof CircleCollider)) {
    return false;
  }

  const dx = aTransform.curr.pos.x - bTransform.curr.pos.x;
  const dy = aTransform.curr.pos.y - bTransform.curr.pos.y;
  const minDistance = a.radius + b.radius;

  return dx * dx + dy * dy < minDistance * minDistance;
}
