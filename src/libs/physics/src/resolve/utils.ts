import { mutate } from "@engine";
import type { Transform2D } from "@engine/components";

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
      mutate(subjectTransform, "curr", (curr) => {
        curr.pos.x = left - radius;
      });
      return;
    }

    mutate(subjectTransform, "curr", (curr) => {
      curr.pos.x = right + radius;
    });
    return;
  }

  if (toTop <= toBottom) {
    mutate(subjectTransform, "curr", (curr) => {
      curr.pos.y = top - radius;
    });
    return;
  }

  mutate(subjectTransform, "curr", (curr) => {
    curr.pos.y = bottom + radius;
  });
}
