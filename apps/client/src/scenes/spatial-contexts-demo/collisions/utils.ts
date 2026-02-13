import type { Transform2D } from "@repo/engine/components";
import { RectangleCollider } from "./colliders/rectangle";

export type RectangleBounds = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

export function clamp(value: number, min: number, max: number): number {
  if (value < min) {
    return min;
  }

  if (value > max) {
    return max;
  }

  return value;
}

export function getRectangleBounds(
  collider: RectangleCollider,
  transform: Transform2D,
): RectangleBounds {
  const x = transform.curr.pos.x;
  const y = transform.curr.pos.y;

  return {
    left: collider.bounds.left + x,
    top: collider.bounds.top + y,
    right: collider.bounds.right + x,
    bottom: collider.bounds.bottom + y,
  };
}
