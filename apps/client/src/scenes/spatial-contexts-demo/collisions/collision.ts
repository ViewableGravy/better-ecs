import type { Transform2D } from "@repo/engine/components";
import { CircleCollider } from "./colliders/circle";
import { CompoundCollider } from "./colliders/compound";
import { RectangleCollider } from "./colliders/rectangle";
import { collides as collidesInternal } from "./collides";
import type { Collider } from "./types";

export function collides(
  a: Collider,
  aTransform: Transform2D,
  b: Collider,
  bTransform: Transform2D,
): boolean {
  return collidesInternal(a, aTransform, b, bTransform);
}

export function resolve(
  subjectCollider: Collider,
  subjectTransform: Transform2D,
  otherCollider: Collider,
  otherTransform: Transform2D,
): void {
  if (subjectCollider instanceof CompoundCollider) {
    for (const child of subjectCollider.children) {
      resolve(child, subjectTransform, otherCollider, otherTransform);
    }

    return;
  }

  if (otherCollider instanceof CompoundCollider) {
    for (const child of otherCollider.children) {
      resolve(subjectCollider, subjectTransform, child, otherTransform);
    }

    return;
  }

  resolvePrimitive(subjectCollider, subjectTransform, otherCollider, otherTransform);
}

function resolvePrimitive(
  subject: CircleCollider | RectangleCollider,
  subjectTransform: Transform2D,
  other: CircleCollider | RectangleCollider,
  otherTransform: Transform2D,
): void {
  if (subject instanceof CircleCollider && other instanceof CircleCollider) {
    resolveCircleVsCircle(subject, subjectTransform, other, otherTransform);
    return;
  }

  if (subject instanceof CircleCollider && other instanceof RectangleCollider) {
    resolveCircleVsRect(subject, subjectTransform, other, otherTransform);
    return;
  }

  if (subject instanceof RectangleCollider && other instanceof CircleCollider) {
    resolveCircleVsRect(other, otherTransform, subject, subjectTransform);
    return;
  }
}

function resolveCircleVsCircle(
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

function resolveCircleVsRect(
  subject: CircleCollider,
  subjectTransform: Transform2D,
  other: RectangleCollider,
  otherTransform: Transform2D,
): void {
  const centerX = subjectTransform.curr.pos.x;
  const centerY = subjectTransform.curr.pos.y;
  const bounds = getRectangleBounds(other, otherTransform);
  const closestX = clamp(centerX, bounds.left, bounds.right);
  const closestY = clamp(centerY, bounds.top, bounds.bottom);
  const dx = centerX - closestX;
  const dy = centerY - closestY;
  const distanceSq = dx * dx + dy * dy;

  if (distanceSq >= subject.radius * subject.radius) {
    return;
  }

  if (distanceSq === 0) {
    resolveCircleInsideRect(subjectTransform, subject.radius, bounds);
    return;
  }

  const distance = Math.sqrt(distanceSq);
  const overlap = subject.radius - distance;
  const nx = dx / distance;
  const ny = dy / distance;

  subjectTransform.curr.pos.x += nx * overlap;
  subjectTransform.curr.pos.y += ny * overlap;
}

function resolveCircleInsideRect(
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

type RectangleBounds = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

function getRectangleBounds(collider: RectangleCollider, transform: Transform2D): RectangleBounds {
  const x = transform.curr.pos.x;
  const y = transform.curr.pos.y;

  return {
    left: collider.bounds.left + x,
    top: collider.bounds.top + y,
    right: collider.bounds.right + x,
    bottom: collider.bounds.bottom + y,
  };
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
