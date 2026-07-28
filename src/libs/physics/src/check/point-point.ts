import type { Transform2D } from "@engine/components";
import { PointCollider } from "@libs/physics/colliders/point";
import type { PrimitiveCollider } from "@libs/physics/types";

export function pointVsPoint(
  a: PrimitiveCollider,
  aTransform: Transform2D,
  b: PrimitiveCollider,
  bTransform: Transform2D,
): boolean {
  if (!(a instanceof PointCollider)) {
    return false;
  }

  if (!(b instanceof PointCollider)) {
    return false;
  }

  return aTransform.curr.pos.x === bTransform.curr.pos.x && aTransform.curr.pos.y === bTransform.curr.pos.y;
}
