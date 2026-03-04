import type { EntityId, UserWorld } from "@engine";
import { Transform2D } from "@engine/components";
import { collides } from "@libs/physics/check";
import { CircleCollider } from "@libs/physics/colliders/circle";
import { CompoundCollider } from "@libs/physics/colliders/compound";
import { PointCollider } from "@libs/physics/colliders/point";
import { RectangleCollider } from "@libs/physics/colliders/rectangle";
import {
  CollisionParticipation,
  type CollisionLayerMask,
} from "@libs/physics/entity/collision-participation";
import { getEntityCollider } from "@libs/physics/entity/get";
import {
  canResolvePhysicsPair,
  entityInLayer,
  matchesSpatialQuery,
  type SpatialQueryFilter,
} from "@libs/physics/filters";
import type { Collider } from "@libs/physics/types";
import type { Class } from "type-fest";

export interface PhysicsBody {
  entityId: EntityId;
  collider: Collider;
  transform: Transform2D;
  participation: CollisionParticipation;
}

export type OverlapQuery = {
  collider: Collider;
  transform: Transform2D;
  filter: SpatialQueryFilter;
};

type QueryLayerComponent = Class<unknown>;

export class PhysicsWorld {
  private readonly bodiesByEntityId = new Map<EntityId, PhysicsBody>();
  private world: UserWorld | undefined;

  public build(world: UserWorld): void {
    this.world = world;
    this.bodiesByEntityId.clear();

    for (const entityId of world.query(Transform2D)) {
      const transform = world.require(entityId, Transform2D);

      const collider = getEntityCollider(world, entityId);
      if (!collider) {
        continue;
      }

      const participation = world.get(entityId, CollisionParticipation);
      if (!participation) {
        continue;
      }

      this.bodiesByEntityId.set(entityId, {
        entityId,
        collider,
        transform,
        participation,
      });
    }
  }

  public getBody(entityId: EntityId): PhysicsBody | undefined {
    return this.bodiesByEntityId.get(entityId);
  }

  public *layers(mask: CollisionLayerMask): Iterable<PhysicsBody> {
    for (const body of this.bodiesByEntityId.values()) {
      if (!entityInLayer(body.participation, mask)) {
        continue;
      }

      yield body;
    }
  }

  public *queryLayer(mask: CollisionLayerMask, componentType?: QueryLayerComponent): Iterable<PhysicsBody> {
    for (const body of this.layers(mask)) {
      if (!componentType) {
        yield body;
        continue;
      }

      if (!this.world || !this.world.has(body.entityId, componentType)) {
        continue;
      }

      yield body;
    }
  }

  public queryFirstLayer(
    mask: CollisionLayerMask,
    componentType?: QueryLayerComponent,
  ): PhysicsBody | undefined {
    for (const body of this.queryLayer(mask, componentType)) {
      return body;
    }

    return undefined;
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

  public collisionCandidates(sourceBody: PhysicsBody): PhysicsBody[] {
    const candidates: PhysicsBody[] = [];

    for (const candidate of this.broadPhase(sourceBody)) {
      if (!canResolvePhysicsPair(sourceBody.participation, candidate.participation)) {
        continue;
      }

      candidates.push(candidate);
    }

    return candidates;
  }

  public queryOverlap(query: OverlapQuery): PhysicsBody[] {
    const sourceBounds = getAabb(query.collider, query.transform);
    const hits: PhysicsBody[] = [];

    for (const candidate of this.bodiesByEntityId.values()) {
      if (!matchesSpatialQuery(candidate.participation, query.filter)) {
        continue;
      }

      const candidateBounds = getAabb(candidate.collider, candidate.transform);
      if (!aabbOverlaps(sourceBounds, candidateBounds)) {
        continue;
      }

      if (!collides(query.collider, query.transform, candidate.collider, candidate.transform)) {
        continue;
      }

      hits.push(candidate);
    }

    return hits;
  }

  public queryFirstOverlap(query: OverlapQuery): PhysicsBody | undefined {
    const sourceBounds = getAabb(query.collider, query.transform);

    for (const candidate of this.bodiesByEntityId.values()) {
      if (!matchesSpatialQuery(candidate.participation, query.filter)) {
        continue;
      }

      const candidateBounds = getAabb(candidate.collider, candidate.transform);
      if (!aabbOverlaps(sourceBounds, candidateBounds)) {
        continue;
      }

      if (collides(query.collider, query.transform, candidate.collider, candidate.transform)) {
        return candidate;
      }
    }

    return undefined;
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

  if (broadPhaseCollider instanceof PointCollider) {
    const x = transform.curr.pos.x;
    const y = transform.curr.pos.y;

    return {
      left: x,
      top: y,
      right: x,
      bottom: y,
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
