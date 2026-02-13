import type { Transform2D } from "@repo/engine/components";
import { CircleCollider } from "./colliders/circle";
import { RectangleCollider } from "./colliders/rectangle";
import type { PrimitiveCollider } from "./types";

export type CollisionFn = (
  a: PrimitiveCollider,
  aTransform: Transform2D,
  b: PrimitiveCollider,
  bTransform: Transform2D,
) => boolean;

/**********************************************************************************************************
 *   COLLIDER FUNCTIONS
 **********************************************************************************************************/
export const circleVsCircle: CollisionFn = (a, aTransform, b, bTransform) => {
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
};

export const circleVsRect: CollisionFn = (a, aTransform, b, bTransform) => {
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
};

export const rectVsRect: CollisionFn = (a, aTransform, b, bTransform) => {
  if (!(a instanceof RectangleCollider)) {
    return false;
  }

  if (!(b instanceof RectangleCollider)) {
    return false;
  }

  // Inline collision
  const aLeft = getRectangleLeft(a, aTransform);
  const aRight = getRectangleRight(a, aTransform);
  const bLeft = getRectangleLeft(b, bTransform);
  const bRight = getRectangleRight(b, bTransform);

  if (aRight <= bLeft || bRight <= aLeft) {
    return false;
  }

  // block collision
  const aTop = getRectangleTop(a, aTransform);
  const aBottom = getRectangleBottom(a, aTransform);
  const bTop = getRectangleTop(b, bTransform);
  const bBottom = getRectangleBottom(b, bTransform);

  if (aBottom <= bTop || bBottom <= aTop) {
    return false;
  }

  return true;
};

/**********************************************************************************************************
 *   UTILITIES
 **********************************************************************************************************/
function getRectangleLeft(collider: RectangleCollider, transform: Transform2D) {
  return collider.bounds.left + transform.curr.pos.x;
}

function getRectangleTop(collider: RectangleCollider, transform: Transform2D) {
  return collider.bounds.top + transform.curr.pos.y;
}

function getRectangleRight(collider: RectangleCollider, transform: Transform2D) {
  return collider.bounds.right + transform.curr.pos.x;
}

function getRectangleBottom(collider: RectangleCollider, transform: Transform2D) {
  return collider.bounds.bottom + transform.curr.pos.y;
}

function clamp(value: number, min: number, max: number): number {
  if (value < min) {
    return min;
  }

  if (value > max) {
    return max;
  }

  return value;
}
