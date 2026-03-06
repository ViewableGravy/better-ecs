import { Parent, Transform2D, WorldTransform2D } from "@engine/components";
import type { EntityId } from "@engine/ecs/entity";
import type { IUserWorld } from "@engine/ecs/world";

const MAX_HIERARCHY_DEPTH = 64;
const LOCAL_STACK: Array<Transform2D | undefined> = new Array(MAX_HIERARCHY_DEPTH);

/**
 * Resolves world-space transform for an entity, supporting parent-child hierarchies.
 *
 * Rules:
 * - Root entities are read from their `Transform2D`.
 * - Child entities are composed from `Parent` + `Transform2D` recursively.
 * - The result includes both `curr` and `prev` to preserve interpolation behavior.
 */
export function resolveWorldTransform2D(
  world: IUserWorld,
  entityId: EntityId,
  out: Transform2D,
): boolean {
  const worldTransform = getWorldTransform2D(world, entityId);
  if (worldTransform) {
    copyTransform2D(out, worldTransform);
    return true;
  }

  return resolveWorldTransform2DFromHierarchy(world, entityId, out);
}

export function getWorldTransform2D(
  world: IUserWorld,
  entityId: EntityId,
): WorldTransform2D | undefined {
  return world.get(entityId, WorldTransform2D);
}

export function copyTransform2D(target: Transform2D, source: Transform2D): void {
  target.curr.copyFrom(source.curr);
  target.prev.copyFrom(source.prev);
}

export function composeWorldTransform2D(
  target: Transform2D,
  parent: Transform2D,
  local: Transform2D,
): void {
  target.curr.pos.x = parent.curr.pos.x + local.curr.pos.x;
  target.curr.pos.y = parent.curr.pos.y + local.curr.pos.y;
  target.curr.rotation = parent.curr.rotation + local.curr.rotation;
  target.curr.scale.x = parent.curr.scale.x * local.curr.scale.x;
  target.curr.scale.y = parent.curr.scale.y * local.curr.scale.y;

  target.prev.pos.x = parent.prev.pos.x + local.prev.pos.x;
  target.prev.pos.y = parent.prev.pos.y + local.prev.pos.y;
  target.prev.rotation = parent.prev.rotation + local.prev.rotation;
  target.prev.scale.x = parent.prev.scale.x * local.prev.scale.x;
  target.prev.scale.y = parent.prev.scale.y * local.prev.scale.y;
}

function resolveWorldTransform2DFromHierarchy(
  world: IUserWorld,
  entityId: EntityId,
  out: Transform2D,
): boolean {
  let currentEntityId = entityId;
  let depth = 0;

  while (true) {
    const parent = world.get(currentEntityId, Parent);
    const transform = world.get(currentEntityId, Transform2D);

    if (!transform) {
      return false;
    }

    if (parent) {
      // Child transform is interpreted as local when Parent is present.
      if (depth >= MAX_HIERARCHY_DEPTH) {
        return false;
      }

      LOCAL_STACK[depth] = transform;
      depth += 1;
      currentEntityId = parent.entityId;
      continue;
    }

    // Root transform (no Parent) is world-space.
    copyTransform2D(out, transform);
    break;
  }

  for (let i = depth - 1; i >= 0; i -= 1) {
    const localTransform = LOCAL_STACK[i];
    LOCAL_STACK[i] = undefined;

    if (!localTransform) {
      return false;
    }

    composeWorldTransform2D(out, out, localTransform);
  }

  return true;
}
