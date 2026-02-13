import type { EntityId, UserWorld } from "@repo/engine";
import { Transform2D } from "@repo/engine/components";
import { CircleCollider } from "./colliders/circle";
import { CompoundCollider } from "./colliders/compound";
import { RectangleCollider } from "./colliders/rectangle";
import { getEntityCollider } from "./entity/get";
import type { Collider } from "./types";

export interface PhysicsBody {
  entityId: EntityId;
  collider: Collider;
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

function getAabb(collider: Collider, transform: Transform2D): Aabb {
  const broadPhaseCollider = collider instanceof CompoundCollider ? collider.collider : collider;

  if (broadPhaseCollider instanceof CircleCollider) {
    const centerX = transform.curr.pos.x;
    const centerY = transform.curr.pos.y;

    return {
      left: centerX - broadPhaseCollider.radius,
      top: centerY - broadPhaseCollider.radius,
      right: centerX + broadPhaseCollider.radius,
      bottom: centerY + broadPhaseCollider.radius,
    };
  }

  if (!(broadPhaseCollider instanceof RectangleCollider)) {
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
    left: broadPhaseCollider.bounds.left + x,
    top: broadPhaseCollider.bounds.top + y,
    right: broadPhaseCollider.bounds.right + x,
    bottom: broadPhaseCollider.bounds.bottom + y,
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
