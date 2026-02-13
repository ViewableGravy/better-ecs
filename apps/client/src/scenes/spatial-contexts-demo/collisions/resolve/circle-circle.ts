import type { Transform2D } from "@repo/engine/components";
import { CircleCollider } from "../colliders/circle";

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
    subjectTransform.curr.pos.x += minDistance;
    return;
  }

  const overlap = minDistance - distance;
  const nx = dx / distance;
  const ny = dy / distance;

  subjectTransform.curr.pos.x += nx * overlap;
  subjectTransform.curr.pos.y += ny * overlap;
}
