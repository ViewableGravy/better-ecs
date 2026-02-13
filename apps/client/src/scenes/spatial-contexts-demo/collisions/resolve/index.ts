import type { Transform2D } from "@repo/engine/components";
import { CircleCollider } from "../colliders/circle";
import { CompoundCollider } from "../colliders/compound";
import { RectangleCollider } from "../colliders/rectangle";
import type { Collider } from "../types";
import { resolveCircleVsCircle } from "./circle-circle";
import { resolveCircleVsRect } from "./circle-rect";
import { resolveRectVsRect } from "./rect-rect";

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

  if (subjectCollider instanceof CircleCollider && otherCollider instanceof CircleCollider) {
    return resolveCircleVsCircle(subjectCollider, subjectTransform, otherCollider, otherTransform);
  }

  if (subjectCollider instanceof CircleCollider && otherCollider instanceof RectangleCollider) {
    return resolveCircleVsRect(subjectCollider, subjectTransform, otherCollider, otherTransform);
  }

  if (subjectCollider instanceof RectangleCollider && otherCollider instanceof CircleCollider) {
    return resolveCircleVsRect(otherCollider, otherTransform, subjectCollider, subjectTransform);
  }

  if (subjectCollider instanceof RectangleCollider && otherCollider instanceof RectangleCollider) {
    return resolveRectVsRect(subjectCollider, subjectTransform, otherCollider, otherTransform);
  }
}
