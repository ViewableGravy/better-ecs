import type { Transform2D } from "@engine/components";
import { CircleCollider } from "@lib/physics/colliders/circle";
import { CompoundCollider } from "@lib/physics/colliders/compound";
import { RectangleCollider } from "@lib/physics/colliders/rectangle";
import type { Collider } from "@lib/physics/types";
import { resolveCircleVsCircle } from "@lib/physics/resolve/circle-circle";
import { resolveCircleVsRect } from "@lib/physics/resolve/circle-rect";
import { resolveRectVsRect } from "@lib/physics/resolve/rect-rect";

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
