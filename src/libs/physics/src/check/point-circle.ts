import type { Transform2D } from "@engine/components";
import { CircleCollider } from "@libs/physics/colliders/circle";
import { PointCollider } from "@libs/physics/colliders/point";
import type { PrimitiveCollider } from "@libs/physics/types";

export function pointVsCircle(
  a: PrimitiveCollider,
  aTransform: Transform2D,
  b: PrimitiveCollider,
  bTransform: Transform2D,
): boolean {
  if (!(a instanceof PointCollider)) {
    return false;
  }

  if (!(b instanceof CircleCollider)) {
    return false;
  }

  const dx = aTransform.curr.pos.x - bTransform.curr.pos.x;
  const dy = aTransform.curr.pos.y - bTransform.curr.pos.y;

  return dx * dx + dy * dy < b.radius * b.radius;
}
