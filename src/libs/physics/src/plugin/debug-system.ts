import type { EntityId, UserWorld } from "@engine";
import { createSystem, resolveWorldTransform2D } from "@engine";
import { Color, Shape, Sprite, Transform2D } from "@engine/components";
import { Engine, fromContext, System } from "@engine/context";
import { CircleCollider } from "@libs/physics/colliders/circle";
import { CompoundCollider } from "@libs/physics/colliders/compound";
import { RectangleCollider } from "@libs/physics/colliders/rectangle";
import { COLLISION_LAYERS, CollisionParticipation } from "@libs/physics/entity/collision-participation";
import { getEntityCollider } from "@libs/physics/entity/get";
import { ColliderDebugProxy } from "@libs/physics/plugin/components/collider-debug-proxy";
import { debugStateSchema, type PhysicsDebugOpts } from "@libs/physics/plugin/types";

const COLLIDER_DEBUG_STYLE = {
  fill: new Color(1, 1, 1, 0.08),
  stroke: new Color(1, 1, 1, 1),
  strokeWidth: 1,
};

const DEBUG_OVERLAY_LAYER = 10_000;
const DEBUG_OVERLAY_Z = 10_000;
const SHARED_WORLD_TRANSFORM = new Transform2D();

export function createDebugSystem(opts: PhysicsDebugOpts) {
  return createSystem("plugin:physics:debug")({
    schema: {
      default: { visible: false },
      schema: debugStateSchema,
    },
    system() {
      const { data } = fromContext(System("plugin:physics:debug"));
      const engine = fromContext(Engine);
      const input = fromContext(System("engine:input"));

      const toggledByConfiguredKeybind = input.matchKeybind(opts.keybind);
      const toggledByAltH = input.matchKeybind({ code: "KeyH", modifiers: { alt: true } });
      const toggledByCtrlH = input.matchKeybind({ code: "KeyH", modifiers: { ctrl: true } });

      if (toggledByConfiguredKeybind || toggledByAltH || toggledByCtrlH) {
        data.visible = !data.visible;
      }

      const sceneWorlds = engine.scene.context.worlds;
      for (const sceneWorld of sceneWorlds) {
        if (!data.visible) {
          sceneWorld.destroy(ColliderDebugProxy);
        } else {
          syncColliderDebugWorld(sceneWorld);
        }
      }
    },
  });
}

function syncColliderDebugWorld(world: UserWorld): void {
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

  applyLayerDebugStyle(world, targetId, debugShape);

  if (!resolveWorldTransform2D(world, targetId, SHARED_WORLD_TRANSFORM)) {
    return;
  }

  if (primitive instanceof CircleCollider) {
    debugShape.type = "circle";
    debugShape.width = primitive.radius * 2;
    debugShape.height = primitive.radius * 2;
    debugTransform.curr.pos.set(SHARED_WORLD_TRANSFORM.curr.pos);
    debugTransform.prev.pos.set(SHARED_WORLD_TRANSFORM.prev.pos);
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

  debugTransform.curr.pos.set(
    SHARED_WORLD_TRANSFORM.curr.pos.x + offsetX,
    SHARED_WORLD_TRANSFORM.curr.pos.y + offsetY,
  );
  debugTransform.prev.pos.set(
    SHARED_WORLD_TRANSFORM.prev.pos.x + offsetX,
    SHARED_WORLD_TRANSFORM.prev.pos.y + offsetY,
  );
}

function applyLayerDebugStyle(world: UserWorld, targetId: EntityId, debugShape: Shape): void {
  if (!debugShape.stroke) {
    debugShape.stroke = new Color(1, 1, 1, 1);
  }

  const participation = world.get(targetId, CollisionParticipation);
  const layers = participation?.layers ?? 0n;

  if ((layers & COLLISION_LAYERS.CONVEYOR) !== 0n) {
    debugShape.stroke.set(0.1, 0.95, 0.95, 1);
    debugShape.fill.set(0.1, 0.95, 0.95, 0.08);
    debugShape.strokeWidth = COLLIDER_DEBUG_STYLE.strokeWidth;
    return;
  }

  if ((layers & COLLISION_LAYERS.ACTOR) !== 0n) {
    debugShape.stroke.set(0.2, 1, 0.25, 1);
    debugShape.fill.set(0.2, 1, 0.25, 0.08);
    debugShape.strokeWidth = COLLIDER_DEBUG_STYLE.strokeWidth;
    return;
  }

  if ((layers & COLLISION_LAYERS.SOLID) !== 0n) {
    debugShape.stroke.set(1, 0.35, 0.25, 1);
    debugShape.fill.set(1, 0.35, 0.25, 0.08);
    debugShape.strokeWidth = COLLIDER_DEBUG_STYLE.strokeWidth;
    return;
  }

  if ((layers & COLLISION_LAYERS.GHOST) !== 0n) {
    debugShape.stroke.set(1, 1, 0.25, 1);
    debugShape.fill.set(1, 1, 0.25, 0.08);
    debugShape.strokeWidth = COLLIDER_DEBUG_STYLE.strokeWidth;
    return;
  }

  debugShape.stroke.set(
    COLLIDER_DEBUG_STYLE.stroke.r,
    COLLIDER_DEBUG_STYLE.stroke.g,
    COLLIDER_DEBUG_STYLE.stroke.b,
    COLLIDER_DEBUG_STYLE.stroke.a,
  );
  debugShape.fill.set(
    COLLIDER_DEBUG_STYLE.fill.r,
    COLLIDER_DEBUG_STYLE.fill.g,
    COLLIDER_DEBUG_STYLE.fill.b,
    COLLIDER_DEBUG_STYLE.fill.a,
  );
  debugShape.strokeWidth = COLLIDER_DEBUG_STYLE.strokeWidth;
}

function getTargetRenderOrder(world: UserWorld, targetId: EntityId): { layer: number; zOrder: number } {
  const targetShape = world.get(targetId, Shape);
  if (targetShape) {
    return {
      layer: Math.max(targetShape.layer + 1, DEBUG_OVERLAY_LAYER),
      zOrder: Math.max(targetShape.zOrder + 0.1, DEBUG_OVERLAY_Z),
    };
  }

  const targetSprite = world.get(targetId, Sprite);
  if (targetSprite) {
    return {
      layer: Math.max(targetSprite.layer + 1, DEBUG_OVERLAY_LAYER),
      zOrder: Math.max(targetSprite.zOrder + 0.1, DEBUG_OVERLAY_Z),
    };
  }

  return {
    layer: DEBUG_OVERLAY_LAYER,
    zOrder: DEBUG_OVERLAY_Z,
  };
}
