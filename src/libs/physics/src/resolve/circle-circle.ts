import type { Transform2D } from "@engine/components";
import { CircleCollider } from "@libs/physics/colliders/circle";
import { translateWithoutInterpolation } from "@libs/physics/resolve/utils";

export function resolveCircleVsCircle(
  subject: CircleCollider,
  subjectTransform: Transform2D,
  other: CircleCollider,
  otherTransform: Transform2D,
): void {
  const dx = subjectTransform.curr.pos.x - otherTransform.curr.pos.x;
  const dy = subjectTransform.curr.pos.y - otherTransform.curr.pos.y;
  const minDistance = subject.radius + other.radius;
  const distanceSq = dx * dx + dy * dy;

  if (distanceSq >= minDistance * minDistance) {
    return;
  }

  const distance = Math.sqrt(distanceSq);
  if (distance === 0) {
    translateWithoutInterpolation(subjectTransform, minDistance, 0);
    return;
  }

  const overlap = minDistance - distance;
  const nx = dx / distance;
  const ny = dy / distance;

  translateWithoutInterpolation(subjectTransform, nx * overlap, ny * overlap);
}
