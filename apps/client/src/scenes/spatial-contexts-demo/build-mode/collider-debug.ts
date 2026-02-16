import type { EntityId, UserWorld } from "@repo/engine";
import { Shape, Sprite, Transform2D } from "@repo/engine/components";
import { CircleCollider, CompoundCollider, RectangleCollider, getEntityCollider } from "@repo/physics";
import { ColliderDebugProxy } from "./components";
import { COLLIDER_DEBUG_STYLE } from "./const";

export function syncColliderDebugWorld(world: UserWorld): void {
  const debugByTarget = new Map<EntityId, EntityId>();

  for (const debugEntityId of world.query(ColliderDebugProxy)) {
    const proxy = world.get(debugEntityId, ColliderDebugProxy);
    if (!proxy) {
      continue;
    }

    debugByTarget.set(proxy.targetId, debugEntityId);
  }

  for (const [targetId, debugEntityId] of debugByTarget) {
    if (!world.has(targetId, Transform2D)) {
      world.destroy(debugEntityId);
      debugByTarget.delete(targetId);
      continue;
    }

    const targetTransform = world.get(targetId, Transform2D);
    const targetCollider = getEntityCollider(world, targetId);
    const debugTransform = world.get(debugEntityId, Transform2D);
    const debugShape = world.get(debugEntityId, Shape);

    if (!targetTransform || !targetCollider || !debugTransform || !debugShape) {
      world.destroy(debugEntityId);
      debugByTarget.delete(targetId);
      continue;
    }

    syncDebugShapeFromTarget(world, targetId, debugShape, debugTransform, targetTransform, targetCollider);
  }

  for (const targetId of world.query(Transform2D)) {
    if (world.has(targetId, ColliderDebugProxy)) {
      continue;
    }

    const targetTransform = world.get(targetId, Transform2D);
    const targetCollider = getEntityCollider(world, targetId);

    if (!targetTransform || !targetCollider) {
      continue;
    }

    const existingDebugEntity = debugByTarget.get(targetId);
    if (existingDebugEntity !== undefined) {
      continue;
    }

    const debugEntityId = world.create();
    const debugShape = new Shape(
      "rectangle",
      1,
      1,
      COLLIDER_DEBUG_STYLE.fill,
      COLLIDER_DEBUG_STYLE.stroke,
      COLLIDER_DEBUG_STYLE.strokeWidth,
      0,
      0,
    );

    const { layer, zOrder } = getTargetRenderOrder(world, targetId);
    debugShape.layer = layer;
    debugShape.zOrder = zOrder;

    const debugTransform = new Transform2D();

    world.add(debugEntityId, debugTransform);
    world.add(debugEntityId, debugShape);
    world.add(debugEntityId, new ColliderDebugProxy(targetId));

    syncDebugShapeFromTarget(world, targetId, debugShape, debugTransform, targetTransform, targetCollider);
    debugByTarget.set(targetId, debugEntityId);
  }
}

function syncDebugShapeFromTarget(
  world: UserWorld,
  targetId: EntityId,
  debugShape: Shape,
  debugTransform: Transform2D,
  targetTransform: Transform2D,
  targetCollider: ReturnType<typeof getEntityCollider>,
): void {
  const primitive = targetCollider instanceof CompoundCollider ? targetCollider.collider : targetCollider;
  if (!primitive) {
    return;
  }

  const { layer, zOrder } = getTargetRenderOrder(world, targetId);
  debugShape.layer = layer;
  debugShape.zOrder = zOrder;

  if (primitive instanceof CircleCollider) {
    debugShape.type = "circle";
    debugShape.width = primitive.radius * 2;
    debugShape.height = primitive.radius * 2;
    debugTransform.curr.pos.set(targetTransform.curr.pos);
    debugTransform.prev.pos.set(targetTransform.prev.pos);
    return;
  }

  if (!(primitive instanceof RectangleCollider)) {
    return;
  }

  debugShape.type = "rectangle";
  debugShape.width = primitive.bounds.size.x;
  debugShape.height = primitive.bounds.size.y;

  const offsetX = primitive.bounds.left + primitive.bounds.size.x / 2;
  const offsetY = primitive.bounds.top + primitive.bounds.size.y / 2;

  debugTransform.curr.pos.set(targetTransform.curr.pos.x + offsetX, targetTransform.curr.pos.y + offsetY);
  debugTransform.prev.pos.set(targetTransform.prev.pos.x + offsetX, targetTransform.prev.pos.y + offsetY);
}

function getTargetRenderOrder(world: UserWorld, targetId: EntityId): { layer: number; zOrder: number } {
  const targetShape = world.get(targetId, Shape);
  if (targetShape) {
    return {
      layer: targetShape.layer,
      zOrder: targetShape.zOrder + 0.1,
    };
  }

  const targetSprite = world.get(targetId, Sprite);
  if (targetSprite) {
    return {
      layer: targetSprite.layer,
      zOrder: targetSprite.zOrder + 0.1,
    };
  }

  return {
    layer: 0,
    zOrder: 0.1,
  };
}
