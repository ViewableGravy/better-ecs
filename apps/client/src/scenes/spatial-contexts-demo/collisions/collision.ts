import type { Transform2D } from "@repo/engine/components";
import { collides as collidesInternal } from "./collides";
import { resolve as resolveInternal } from "./resolve";
import type { Collider } from "./types";

export function collides(
  a: Collider,
  aTransform: Transform2D,
  b: Collider,
  bTransform: Transform2D,
): boolean {
  return collidesInternal(a, aTransform, b, bTransform);
}

/**
 * Resolves a collision by moving the subject collider out of the other collider.
 * This function assumes that the colliders are already colliding, and does
 * not perform any checks before resolving.
 */
export function resolve(
  subjectCollider: Collider,
  subjectTransform: Transform2D,
  otherCollider: Collider,
  otherTransform: Transform2D,
): void {
  resolveInternal(subjectCollider, subjectTransform, otherCollider, otherTransform);
}
