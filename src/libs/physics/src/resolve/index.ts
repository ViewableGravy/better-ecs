import type { Transform2D } from "@engine/components";
import { CircleCollider } from "@libs/physics/colliders/circle";
import { CompoundCollider } from "@libs/physics/colliders/compound";
import { RectangleCollider } from "@libs/physics/colliders/rectangle";
import type { Collider } from "@libs/physics/types";
import { resolveCircleVsCircle } from "@libs/physics/resolve/circle-circle";
import { resolveCircleVsRect } from "@libs/physics/resolve/circle-rect";
import { resolveRectVsRect } from "@libs/physics/resolve/rect-rect";

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
    return resolveRectVsRect();
  }
}
