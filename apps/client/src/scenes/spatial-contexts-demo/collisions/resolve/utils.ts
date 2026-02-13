import type { Transform2D } from "@repo/engine/components";
import type { RectangleBounds } from "../utils";

export function resolveCircleInsideRect(
  subjectTransform: Transform2D,
  radius: number,
  bounds: RectangleBounds,
): void {
  const x = subjectTransform.curr.pos.x;
  const y = subjectTransform.curr.pos.y;
  const toLeft = x - bounds.left;
  const toRight = bounds.right - x;
  const toTop = y - bounds.top;
  const toBottom = bounds.bottom - y;
  const minHorizontal = Math.min(toLeft, toRight);
  const minVertical = Math.min(toTop, toBottom);

  if (minHorizontal <= minVertical) {
    if (toLeft <= toRight) {
      subjectTransform.curr.pos.x = bounds.left - radius;
      return;
    }

    subjectTransform.curr.pos.x = bounds.right + radius;
    return;
  }

  if (toTop <= toBottom) {
    subjectTransform.curr.pos.y = bounds.top - radius;
    return;
  }

  subjectTransform.curr.pos.y = bounds.bottom + radius;
}
