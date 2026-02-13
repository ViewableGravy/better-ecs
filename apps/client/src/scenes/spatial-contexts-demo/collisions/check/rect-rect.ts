import type { Transform2D } from "@repo/engine/components";
import { RectangleCollider } from "../colliders/rectangle";
import type { PrimitiveCollider } from "../types";
import { getRectangleBounds } from "../utils";

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

  const aBounds = getRectangleBounds(a, aTransform);
  const bBounds = getRectangleBounds(b, bTransform);

  if (aBounds.right <= bBounds.left || bBounds.right <= aBounds.left) {
    return false;
  }

  if (aBounds.bottom <= bBounds.top || bBounds.bottom <= aBounds.top) {
    return false;
  }

  return true;
}
