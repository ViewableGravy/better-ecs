import type { EntityId, UserWorld } from "@repo/engine";
import { Transform2D } from "@repo/engine/components";
import { CircleCollider } from "./colliders/circle";
import { RectangleCollider } from "./colliders/rectangle";
import { collides } from "./collides";
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

export function circleEntitiesCollide(world: UserWorld, a: EntityId, b: EntityId): boolean {
  const transformA = world.get(a, Transform2D);
  if (!transformA) {
    return false;
  }

  const colliderA = getEntityCollider(world, a);
  if (!(colliderA instanceof CircleCollider)) {
    return false;
  }

  const transformB = world.get(b, Transform2D);
  if (!transformB) {
    return false;
  }

  const colliderB = getEntityCollider(world, b);
  if (!(colliderB instanceof CircleCollider)) {
    return false;
  }

  return collides(colliderA, transformA, colliderB, transformB);
}

export function entitiesCollide(world: UserWorld, a: EntityId, b: EntityId): boolean {
  const transformA = world.get(a, Transform2D);
  if (!transformA) {
    return false;
  }

  const colliderA = getEntityCollider(world, a);
  if (!colliderA) {
    return false;
  }

  const transformB = world.get(b, Transform2D);
  if (!transformB) {
    return false;
  }

  const colliderB = getEntityCollider(world, b);
  if (!colliderB) {
    return false;
  }

  return collides(colliderA, transformA, colliderB, transformB);
}
