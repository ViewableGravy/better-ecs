import type { EntityId, UserWorld } from "@repo/engine";
import { Transform2D } from "@repo/engine/components";
import { CircleCollider } from "./colliders/circle";
import { RectangleCollider } from "./colliders/rectangle";
import { getEntityCollider } from "./entity-collider";
import type { PrimitiveCollider } from "./types";

export interface PhysicsBody {
  entityId: EntityId;
  collider: PrimitiveCollider;
  transform: Transform2D;
}

export class PhysicsWorld {
  private readonly bodiesByEntityId = new Map<EntityId, PhysicsBody>();

  public build(world: UserWorld): void {
    this.bodiesByEntityId.clear();

    for (const entityId of world.query(Transform2D)) {
      const transform = world.get(entityId, Transform2D);
      if (!transform) {
        continue;
      }

      const collider = getEntityCollider(world, entityId);
      if (!collider) {
        continue;
      }

      this.bodiesByEntityId.set(entityId, {
        entityId,
        collider,
        transform,
      });
    }
  }

  public getBody(entityId: EntityId): PhysicsBody | undefined {
    return this.bodiesByEntityId.get(entityId);
  }

  public broadPhase(sourceBody: PhysicsBody): PhysicsBody[] {
    const sourceBounds = getAabb(sourceBody.collider, sourceBody.transform);
    const candidates: PhysicsBody[] = [];

    for (const candidate of this.bodiesByEntityId.values()) {
      if (candidate.entityId === sourceBody.entityId) {
        continue;
      }

      const candidateBounds = getAabb(candidate.collider, candidate.transform);
      if (!aabbOverlaps(sourceBounds, candidateBounds)) {
        continue;
      }

      candidates.push(candidate);
    }

    return candidates;
  }
}

type Aabb = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

function getAabb(collider: PrimitiveCollider, transform: Transform2D): Aabb {
  if (collider instanceof CircleCollider) {
    const centerX = transform.curr.pos.x;
    const centerY = transform.curr.pos.y;

    return {
      left: centerX - collider.radius,
      top: centerY - collider.radius,
      right: centerX + collider.radius,
      bottom: centerY + collider.radius,
    };
  }

  if (!(collider instanceof RectangleCollider)) {
    return {
      left: 0,
      top: 0,
      right: 0,
      bottom: 0,
    };
  }

  const x = transform.curr.pos.x;
  const y = transform.curr.pos.y;

  return {
    left: collider.bounds.left + x,
    top: collider.bounds.top + y,
    right: collider.bounds.right + x,
    bottom: collider.bounds.bottom + y,
  };
}

function aabbOverlaps(a: Aabb, b: Aabb): boolean {
  if (a.right <= b.left || b.right <= a.left) {
    return false;
  }

  if (a.bottom <= b.top || b.bottom <= a.top) {
    return false;
  }

  return true;
}
