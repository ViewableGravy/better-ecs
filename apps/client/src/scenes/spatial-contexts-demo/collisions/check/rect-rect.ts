import type { Transform2D } from "@repo/engine/components";
import { RectangleCollider } from "../colliders/rectangle";
import type { PrimitiveCollider } from "../types";
import { getRectangleBottom, getRectangleLeft, getRectangleRight, getRectangleTop } from "../utils";

export function rectVsRect(
  a: PrimitiveCollider,
  aTransform: Transform2D,
  b: PrimitiveCollider,
  bTransform: Transform2D,
): boolean {
  if (!(a instanceof RectangleCollider)) {
    return false;
  }

  if (!(b instanceof RectangleCollider)) {
    return false;
  }

  const aLeft = getRectangleLeft(a, aTransform);
  const aRight = getRectangleRight(a, aTransform);
  const bLeft = getRectangleLeft(b, bTransform);
  const bRight = getRectangleRight(b, bTransform);

  if (aRight <= bLeft || bRight <= aLeft) {
    return false;
  }

  const aTop = getRectangleTop(a, aTransform);
  const bTop = getRectangleTop(b, bTransform);
  const aBottom = getRectangleBottom(a, aTransform);
  const bBottom = getRectangleBottom(b, bTransform);

  if (aBottom <= bTop || bBottom <= aTop) {
    return false;
  }

  return true;
}
