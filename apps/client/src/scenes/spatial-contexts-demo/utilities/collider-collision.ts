import type { EntityId, UserWorld } from "@repo/engine";
import { Rectangle, Vec2 } from "@repo/engine";
import { Transform2D } from "@repo/engine/components";
import { CircleCollider } from "../collisions/colliders/circle";
import { RectangleCollider } from "../collisions/colliders/rectangle";

export class CircleColliderShape {
  public constructor(
    public center: Vec2,
    public radius: number,
  ) {}
}

export class RectangleColliderShape {
  public constructor(public bounds: Rectangle) {}
}

export type ColliderShape = CircleColliderShape | RectangleColliderShape;

export function createCircleShape(
  transform: Transform2D,
  collider: CircleCollider,
): CircleColliderShape {
  return new CircleColliderShape(
    new Vec2(transform.curr.pos.x, transform.curr.pos.y),
    collider.radius,
  );
}

export function createRectangleShape(
  transform: Transform2D,
  collider: RectangleCollider,
): RectangleColliderShape {
  return new RectangleColliderShape(collider.bounds.translated(transform.curr.pos.clone()));
}

export function collides(a: ColliderShape, b: ColliderShape): boolean {
  if (a instanceof CircleColliderShape && b instanceof CircleColliderShape) {
    return circleVsCircle(a, b);
  }

  if (a instanceof CircleColliderShape && b instanceof RectangleColliderShape) {
    return circleVsRectangle(a, b);
  }

  if (a instanceof RectangleColliderShape && b instanceof CircleColliderShape) {
    return circleVsRectangle(b, a);
  }

  if (a instanceof RectangleColliderShape && b instanceof RectangleColliderShape) {
    return rectangleVsRectangle(a, b);
  }

  return false;
}

export function circleEntitiesCollide(world: UserWorld, a: EntityId, b: EntityId): boolean {
  const circleA = getEntityCircleShape(world, a);
  if (!circleA) {
    return false;
  }

  const circleB = getEntityCircleShape(world, b);
  if (!circleB) {
    return false;
  }

  return collides(circleA, circleB);
}

export function entitiesCollide(world: UserWorld, a: EntityId, b: EntityId): boolean {
  const colliderA = getEntityColliderShape(world, a);
  if (!colliderA) {
    return false;
  }

  const colliderB = getEntityColliderShape(world, b);
  if (!colliderB) {
    return false;
  }

  return collides(colliderA, colliderB);
}

function getEntityCircleShape(
  world: UserWorld,
  entityId: EntityId,
): CircleColliderShape | undefined {
  const transform = world.get(entityId, Transform2D);
  if (!transform) {
    return undefined;
  }

  const collider = world.get(entityId, CircleCollider);
  if (!collider) {
    return undefined;
  }

  return createCircleShape(transform, collider);
}

function getEntityColliderShape(world: UserWorld, entityId: EntityId): ColliderShape | undefined {
  const transform = world.get(entityId, Transform2D);
  if (!transform) {
    return undefined;
  }

  const circle = world.get(entityId, CircleCollider);
  if (circle) {
    return createCircleShape(transform, circle);
  }

  const rectangle = world.get(entityId, RectangleCollider);
  if (rectangle) {
    return createRectangleShape(transform, rectangle);
  }

  return undefined;
}

function circleVsCircle(a: CircleColliderShape, b: CircleColliderShape): boolean {
  const dx = a.center.x - b.center.x;
  const dy = a.center.y - b.center.y;
  const radius = a.radius + b.radius;
  return dx * dx + dy * dy < radius * radius;
}

function circleVsRectangle(
  circle: CircleColliderShape,
  rectangle: RectangleColliderShape,
): boolean {
  const closestX = clamp(circle.center.x, rectangle.bounds.left, rectangle.bounds.right);
  const closestY = clamp(circle.center.y, rectangle.bounds.top, rectangle.bounds.bottom);
  const dx = circle.center.x - closestX;
  const dy = circle.center.y - closestY;
  return dx * dx + dy * dy < circle.radius * circle.radius;
}

function rectangleVsRectangle(a: RectangleColliderShape, b: RectangleColliderShape): boolean {
  if (a.bounds.right <= b.bounds.left || b.bounds.right <= a.bounds.left) {
    return false;
  }

  if (a.bounds.bottom <= b.bounds.top || b.bounds.bottom <= a.bounds.top) {
    return false;
  }

  return true;
}

function clamp(value: number, min: number, max: number): number {
  if (value < min) {
    return min;
  }

  if (value > max) {
    return max;
  }

  return value;
}
