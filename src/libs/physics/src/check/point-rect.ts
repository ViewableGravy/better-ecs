import type { Transform2D } from "@engine/components";
import { PointCollider } from "@libs/physics/colliders/point";
import { RectangleCollider } from "@libs/physics/colliders/rectangle";
import type { PrimitiveCollider } from "@libs/physics/types";
import { getRectangleBottom, getRectangleLeft, getRectangleRight, getRectangleTop } from "@libs/physics/utils";

export function pointVsRect(
  a: PrimitiveCollider,
  aTransform: Transform2D,
  b: PrimitiveCollider,
  bTransform: Transform2D,
): boolean {
  if (!(a instanceof PointCollider)) {
    return false;
  }

  if (!(b instanceof RectangleCollider)) {
    return false;
  }

  const pointX = aTransform.curr.pos.x;
  const pointY = aTransform.curr.pos.y;

  const left = getRectangleLeft(b, bTransform);
  const right = getRectangleRight(b, bTransform);
  const top = getRectangleTop(b, bTransform);
  const bottom = getRectangleBottom(b, bTransform);

  return pointX >= left && pointX <= right && pointY >= top && pointY <= bottom;
}
