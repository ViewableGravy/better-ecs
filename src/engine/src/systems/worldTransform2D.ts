import { Parent, Transform2D, WorldTransform2D } from "@engine/components";
import { fromContext, Scene } from "@engine/context";
import { composeWorldTransform2D, copyTransform2D } from "@engine/ecs/hierarchy";
import type { EntityId } from "@engine/ecs/entity";
import type { UserWorld } from "@engine/ecs/world";
import { createSystem } from "@engine/core/system";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/
type ChildrenByParentMap = Map<EntityId, EntityId[]>;

/**********************************************************************************************************
 *   CONSTS
 **********************************************************************************************************/
const MAX_WORLD_TRANSFORM_DEPTH = 64;
const TRANSFORM_ENTITY_IDS: EntityId[] = [];
const STALE_ENTITY_IDS: EntityId[] = [];
const DIRTY_ENTITY_IDS: EntityId[] = [];
const DIRTY_ENTITY_SET = new Set<EntityId>();
const COMPUTED_ENTITY_SET = new Set<EntityId>();
const CHILDREN_BY_PARENT: ChildrenByParentMap = new Map();

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/
export const worldTransform2DSystem = createSystem("engine:worldTransform2D")({
  priority: -1_000_000,
  system() {
    const scene = fromContext(Scene);

    for (const world of scene.worlds) {
      syncWorldTransform2D(world);
    }
  },
});

export function syncWorldTransform2D(world: UserWorld): void {
  clearSyncScratch();
  collectChildrenByParent(world, CHILDREN_BY_PARENT);
  removeStaleWorldTransforms(world);
  collectTransformEntities(world, TRANSFORM_ENTITY_IDS);
  collectDirtyEntities(world, TRANSFORM_ENTITY_IDS);
  syncDirtySubtrees(world);
  clearSyncScratch();
}

export function syncWorldTransform2DSubtree(world: UserWorld, entityId: EntityId): void {
  clearSyncScratch();
  collectChildrenByParent(world, CHILDREN_BY_PARENT);
  syncEntitySubtree(world, entityId, 0);
  clearSyncScratch();
}

function clearSyncScratch(): void {
  TRANSFORM_ENTITY_IDS.length = 0;
  STALE_ENTITY_IDS.length = 0;
  DIRTY_ENTITY_IDS.length = 0;
  DIRTY_ENTITY_SET.clear();
  COMPUTED_ENTITY_SET.clear();
  CHILDREN_BY_PARENT.clear();
}

function collectChildrenByParent(world: UserWorld, target: ChildrenByParentMap): void {
  world.forEach(Parent, (entityId, parent) => {
    if (!world.has(entityId, Transform2D)) {
      return;
    }

    const existingChildren = target.get(parent.entityId);
    if (existingChildren) {
      existingChildren.push(entityId);
      return;
    }

    target.set(parent.entityId, [entityId]);
  });
}

function removeStaleWorldTransforms(world: UserWorld): void {
  world.forEach(WorldTransform2D, (entityId) => {
    if (world.has(entityId, Transform2D)) {
      return;
    }

    STALE_ENTITY_IDS.push(entityId);
  });

  for (let index = 0; index < STALE_ENTITY_IDS.length; index += 1) {
    const entityId = STALE_ENTITY_IDS[index];
    if (entityId === undefined) {
      continue;
    }

    world.remove(entityId, WorldTransform2D);
  }

  STALE_ENTITY_IDS.length = 0;
}

function collectTransformEntities(world: UserWorld, target: EntityId[]): void {
  world.forEach(Transform2D, (entityId) => {
    target.push(entityId);
  });
}

function collectDirtyEntities(world: UserWorld, entityIds: readonly EntityId[]): void {
  for (let index = 0; index < entityIds.length; index += 1) {
    const entityId = entityIds[index];
    if (entityId === undefined) {
      continue;
    }

    if (!isWorldTransformDirty(world, entityId)) {
      continue;
    }

    DIRTY_ENTITY_IDS.push(entityId);
    DIRTY_ENTITY_SET.add(entityId);
  }
}

function isWorldTransformDirty(world: UserWorld, entityId: EntityId): boolean {
  const localTransform = world.get(entityId, Transform2D);
  if (!localTransform) {
    return false;
  }

  const worldTransform = world.get(entityId, WorldTransform2D);
  if (!worldTransform) {
    return true;
  }

  const currentParentId = world.get(entityId, Parent)?.entityId ?? null;
  if (worldTransform.parentEntityId !== currentParentId) {
    return true;
  }

  return isLocalTransformDirty(localTransform);
}

function isLocalTransformDirty(transform: Transform2D): boolean {
  return transform.curr.pos.x !== transform.prev.pos.x
    || transform.curr.pos.y !== transform.prev.pos.y
    || transform.curr.rotation !== transform.prev.rotation
    || transform.curr.scale.x !== transform.prev.scale.x
    || transform.curr.scale.y !== transform.prev.scale.y;
}

function syncDirtySubtrees(world: UserWorld): void {
  for (let index = 0; index < DIRTY_ENTITY_IDS.length; index += 1) {
    const entityId = DIRTY_ENTITY_IDS[index];
    if (entityId === undefined) {
      continue;
    }

    const parentId = world.get(entityId, Parent)?.entityId;
    if (parentId !== undefined && DIRTY_ENTITY_SET.has(parentId)) {
      continue;
    }

    syncEntitySubtree(world, entityId, 0);
  }
}

function syncEntitySubtree(
  world: UserWorld,
  entityId: EntityId,
  depth: number,
): boolean {
  if (COMPUTED_ENTITY_SET.has(entityId)) {
    return true;
  }

  if (depth > MAX_WORLD_TRANSFORM_DEPTH) {
    invalidateWorldTransformSubtree(world, entityId);
    return false;
  }

  const localTransform = world.get(entityId, Transform2D);
  if (!localTransform) {
    invalidateWorldTransformSubtree(world, entityId);
    return false;
  }

  let worldTransform = world.get(entityId, WorldTransform2D);
  if (!worldTransform) {
    worldTransform = new WorldTransform2D();
    world.add(entityId, worldTransform);
  }

  const parentId = world.get(entityId, Parent)?.entityId ?? null;
  worldTransform.parentEntityId = parentId;

  if (parentId === null) {
    copyTransform2D(worldTransform, localTransform);
  } else {
    const parentWorldTransform = world.get(parentId, WorldTransform2D);
    if (!parentWorldTransform && !syncEntitySubtree(world, parentId, depth + 1)) {
      invalidateWorldTransformSubtree(world, entityId);
      return false;
    }

    const resolvedParentWorldTransform = world.get(parentId, WorldTransform2D);
    if (!resolvedParentWorldTransform) {
      invalidateWorldTransformSubtree(world, entityId);
      return false;
    }

    composeWorldTransform2D(worldTransform, resolvedParentWorldTransform, localTransform);
  }

  COMPUTED_ENTITY_SET.add(entityId);

  const childEntityIds = CHILDREN_BY_PARENT.get(entityId);
  if (!childEntityIds) {
    return true;
  }

  for (let index = 0; index < childEntityIds.length; index += 1) {
    const childEntityId = childEntityIds[index];
    if (childEntityId === undefined) {
      continue;
    }

    syncEntitySubtree(world, childEntityId, depth + 1);
  }

  return true;
}

function invalidateWorldTransformSubtree(world: UserWorld, entityId: EntityId): void {
  if (world.has(entityId, WorldTransform2D)) {
    world.remove(entityId, WorldTransform2D);
  }

  const childEntityIds = CHILDREN_BY_PARENT.get(entityId);
  if (!childEntityIds) {
    return;
  }

  for (let index = 0; index < childEntityIds.length; index += 1) {
    const childEntityId = childEntityIds[index];
    if (childEntityId === undefined) {
      continue;
    }

    invalidateWorldTransformSubtree(world, childEntityId);
  }
}