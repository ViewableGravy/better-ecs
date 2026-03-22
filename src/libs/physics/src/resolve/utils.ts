import { mutate } from "@engine";
import type { Transform2D } from "@engine/components";

export function translateWithoutInterpolation(
  subjectTransform: Transform2D,
  deltaX: number,
  deltaY: number,
): void {
  mutate(subjectTransform, "curr", (curr) => {
    curr.pos.x += deltaX;
    curr.pos.y += deltaY;
  });

  subjectTransform.prev.pos.x += deltaX;
  subjectTransform.prev.pos.y += deltaY;
}

export function setPositionWithoutInterpolation(
  subjectTransform: Transform2D,
  nextX: number,
  nextY: number,
): void {
  mutate(subjectTransform, "curr", (curr) => {
    curr.pos.x = nextX;
    curr.pos.y = nextY;
  });

  subjectTransform.prev.pos.x = nextX;
  subjectTransform.prev.pos.y = nextY;
}

/**
 * Resolves a circle center that is inside a rectangle to the nearest outside edge.
 *
 * Keep this scalar-based to avoid temporary rectangle bounds allocations.
 */
export function resolveCircleInsideRect(
  subjectTransform: Transform2D,
  radius: number,
  left: number,
  top: number,
  right: number,
  bottom: number,
): void {
  const x = subjectTransform.curr.pos.x;
  const y = subjectTransform.curr.pos.y;
  const toLeft = x - left;
  const toRight = right - x;
  const toTop = y - top;
  const toBottom = bottom - y;
  const minHorizontal = Math.min(toLeft, toRight);
  const minVertical = Math.min(toTop, toBottom);

  if (minHorizontal <= minVertical) {
    if (toLeft <= toRight) {
      setPositionWithoutInterpolation(subjectTransform, left - radius, y);
      return;
    }

    setPositionWithoutInterpolation(subjectTransform, right + radius, y);
    return;
  }

  if (toTop <= toBottom) {
    setPositionWithoutInterpolation(subjectTransform, x, top - radius);
    return;
  }

  setPositionWithoutInterpolation(subjectTransform, x, bottom + radius);
}
