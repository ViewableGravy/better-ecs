import type { CollisionLayerMask, CollisionParticipation } from "@libs/physics/entity/collision-participation";

export type SpatialQueryFilter = {
  category: CollisionLayerMask;
  mask: CollisionLayerMask;
};

/**
 * Returns true when at least one bit from `mask` exists in `layers`.
 */
export function inLayer(layers: CollisionLayerMask, mask: CollisionLayerMask): boolean {
  return (layers & mask) !== 0n;
}

/**
 * Returns true when an entity belongs to at least one layer in `mask`.
 */
export function entityInLayer(
  participation: CollisionParticipation,
  mask: CollisionLayerMask,
): boolean {
  return inLayer(participation.layers, mask);
}

/**
 * Returns true when two participants are allowed to resolve physically.
 */
export function canResolvePhysicsPair(
  subject: CollisionParticipation,
  target: CollisionParticipation,
): boolean {
  if (subject.isSensor || target.isSensor) {
    return false;
  }

  return inLayer(subject.layers, target.collidesWith) && inLayer(target.layers, subject.collidesWith);
}

/**
 * Returns true when a target entity is included by the provided query filter.
 */
export function matchesSpatialQuery(
  target: CollisionParticipation,
  filter: SpatialQueryFilter,
): boolean {
  return inLayer(target.layers, filter.mask) && inLayer(target.queryableBy, filter.category);
}
