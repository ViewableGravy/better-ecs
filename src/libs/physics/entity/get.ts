import type { EntityId, UserWorld } from "@engine";
import { CircleCollider } from "@lib/physics/colliders/circle";
import { CompoundCollider } from "@lib/physics/colliders/compound";
import { RectangleCollider } from "@lib/physics/colliders/rectangle";
import type { Collider } from "@lib/physics/types";

/**
 * Returns the primary collider component for an entity.
 *
 * This intentionally supports both primitive and compound colliders so entities can
 * use a compound collider as their primary shape while still benefiting from broad-phase
 * pruning via its parent collider.
 */
export function getEntityCollider(world: UserWorld, entityId: EntityId): Collider | undefined {
  const compound = world.get(entityId, CompoundCollider);
  if (compound) {
    return compound;
  }

  const circle = world.get(entityId, CircleCollider);
  if (circle) {
    return circle;
  }

  const rectangle = world.get(entityId, RectangleCollider);
  if (rectangle) {
    return rectangle;
  }

  return undefined;
}
