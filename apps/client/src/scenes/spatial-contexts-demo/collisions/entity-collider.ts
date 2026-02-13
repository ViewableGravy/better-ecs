import type { EntityId, UserWorld } from "@repo/engine";
import { CircleCollider } from "./colliders/circle";
import { RectangleCollider } from "./colliders/rectangle";
import type { PrimitiveCollider } from "./types";

export function getEntityCollider(
  world: UserWorld,
  entityId: EntityId,
): PrimitiveCollider | undefined {
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
