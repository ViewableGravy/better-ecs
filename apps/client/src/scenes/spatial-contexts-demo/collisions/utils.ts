import type { Transform2D } from "@repo/engine/components";
import { RectangleCollider } from "./colliders/rectangle";

export function clamp(value: number, min: number, max: number): number {
  if (value < min) {
    return min;
  }

  if (value > max) {
    return max;
  }

  return value;
}

/**
 * Returns the world-space left edge of a rectangle collider as a primitive value.
 *
 * Keep this allocation-free. Do not replace with an object-returning helper.
 */
export function getRectangleLeft(collider: RectangleCollider, transform: Transform2D): number {
  return collider.bounds.left + transform.curr.pos.x;
}

/**
 * Returns the world-space top edge of a rectangle collider as a primitive value.
 *
 * Keep this allocation-free. Do not replace with an object-returning helper.
 */
export function getRectangleTop(collider: RectangleCollider, transform: Transform2D): number {
  return collider.bounds.top + transform.curr.pos.y;
}

/**
 * Returns the world-space right edge of a rectangle collider as a primitive value.
 *
 * Keep this allocation-free. Do not replace with an object-returning helper.
 */
export function getRectangleRight(collider: RectangleCollider, transform: Transform2D): number {
  return collider.bounds.right + transform.curr.pos.x;
}

/**
 * Returns the world-space bottom edge of a rectangle collider as a primitive value.
 *
 * Keep this allocation-free. Do not replace with an object-returning helper.
 */
export function getRectangleBottom(collider: RectangleCollider, transform: Transform2D): number {
  return collider.bounds.bottom + transform.curr.pos.y;
}
