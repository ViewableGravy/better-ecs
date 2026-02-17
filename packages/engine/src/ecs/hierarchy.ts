import { LocalTransform2D, Parent, Transform2D } from "../components";
import type { EntityId } from "./entity";
import type { IUserWorld } from "./world";

const MAX_HIERARCHY_DEPTH = 64;
const LOCAL_STACK: Array<LocalTransform2D | undefined> = new Array(MAX_HIERARCHY_DEPTH);

/**
 * Resolves world-space transform for an entity, supporting parent-child hierarchies.
 *
 * Rules:
 * - Root entities are read from their `Transform2D`.
 * - Child entities are composed from `Parent` + `LocalTransform2D` recursively.
 * - The result includes both `curr` and `prev` to preserve interpolation behavior.
 */
export function resolveWorldTransform2D(
  world: IUserWorld,
  entityId: EntityId,
  out: Transform2D,
): boolean {
  let currentEntityId = entityId;
  let depth = 0;

  while (true) {
    const parent = world.get(currentEntityId, Parent);
    const localTransform = world.get(currentEntityId, LocalTransform2D);

    if (parent || localTransform) {
      if (!parent || !localTransform) {
        return false;
      }

      if (depth >= MAX_HIERARCHY_DEPTH) {
        return false;
      }

      LOCAL_STACK[depth] = localTransform;
      depth += 1;
      currentEntityId = parent.entityId;
      continue;
    }

    const worldTransform = world.get(currentEntityId, Transform2D);
    if (!worldTransform) {
      return false;
    }

    out.curr.copyFrom(worldTransform.curr);
    out.prev.copyFrom(worldTransform.prev);
    break;
  }

  for (let i = depth - 1; i >= 0; i -= 1) {
    const localTransform = LOCAL_STACK[i];
    LOCAL_STACK[i] = undefined;

    if (!localTransform) {
      return false;
    }

    out.curr.pos.x += localTransform.curr.pos.x;
    out.curr.pos.y += localTransform.curr.pos.y;
    out.curr.rotation += localTransform.curr.rotation;
    out.curr.scale.x *= localTransform.curr.scale.x;
    out.curr.scale.y *= localTransform.curr.scale.y;

    out.prev.pos.x += localTransform.prev.pos.x;
    out.prev.pos.y += localTransform.prev.pos.y;
    out.prev.rotation += localTransform.prev.rotation;
    out.prev.scale.x *= localTransform.prev.scale.x;
    out.prev.scale.y *= localTransform.prev.scale.y;
  }

  return true;
}
