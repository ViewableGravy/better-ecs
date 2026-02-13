import type { Transform2D } from "@repo/engine/components";
import { CircleCollider } from "../colliders/circle";
import { RectangleCollider } from "../colliders/rectangle";
import {
  clamp,
  getRectangleBottom,
  getRectangleLeft,
  getRectangleRight,
  getRectangleTop,
} from "../utils";
import { resolveCircleInsideRect } from "./utils";

export function resolveCircleVsRect(
  subject: CircleCollider,
  subjectTransform: Transform2D,
  other: RectangleCollider,
  otherTransform: Transform2D,
): void {
  const centerX = subjectTransform.curr.pos.x;
  const centerY = subjectTransform.curr.pos.y;
  const left = getRectangleLeft(other, otherTransform);
  const top = getRectangleTop(other, otherTransform);
  const right = getRectangleRight(other, otherTransform);
  const bottom = getRectangleBottom(other, otherTransform);
  const closestX = clamp(centerX, left, right);
  const closestY = clamp(centerY, top, bottom);
  const dx = centerX - closestX;
  const dy = centerY - closestY;
  const distanceSq = dx * dx + dy * dy;

  if (distanceSq >= subject.radius * subject.radius) {
    return;
  }

  if (distanceSq === 0) {
    resolveCircleInsideRect(subjectTransform, subject.radius, left, top, right, bottom);
    return;
  }

  const distance = Math.sqrt(distanceSq);
  const overlap = subject.radius - distance;
  const nx = dx / distance;
  const ny = dy / distance;

  subjectTransform.curr.pos.x += nx * overlap;
  subjectTransform.curr.pos.y += ny * overlap;
}
