import type { Transform2D } from "@repo/engine/components";
import { CircleCollider } from "../colliders/circle";
import { RectangleCollider } from "../colliders/rectangle";
import type { PrimitiveCollider } from "../types";
import {
  clamp,
  getRectangleBottom,
  getRectangleLeft,
  getRectangleRight,
  getRectangleTop,
} from "../utils";

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

  const left = getRectangleLeft(b, bTransform);
  const top = getRectangleTop(b, bTransform);
  const right = getRectangleRight(b, bTransform);
  const bottom = getRectangleBottom(b, bTransform);
  const centerX = aTransform.curr.pos.x;
  const centerY = aTransform.curr.pos.y;
  const closestX = clamp(centerX, left, right);
  const closestY = clamp(centerY, top, bottom);
  const dx = centerX - closestX;
  const dy = centerY - closestY;

  return dx * dx + dy * dy < a.radius * a.radius;
}
