import { Parent, Transform2D, WorldTransform2D } from "@engine/components";
import { ActiveRegistry, fromContext } from "@engine/context";
import { createSystem } from "@engine/core/system";
import type { EntityId } from "@engine/ecs/entity";
import { composeWorldTransform2D, copyTransform2D } from "@engine/ecs/hierarchy";
import type { Registry } from "@engine/ecs/registry";
import { transform2DTracker } from "@engine/systems/transform2d-tracker";

const MAX_WORLD_TRANSFORM_DEPTH = 64;
const DENSE_DIRTY_RATIO = 0.5;
const COMPUTED_ENTITY_IDS = new Set<EntityId>();
const DIRTY_ENTITY_IDS = new Set<EntityId>();
const INVALIDATION_STACK: EntityId[] = [];

let PATCH_LOCAL_TRANSFORM: Transform2D = new Transform2D();
let PATCH_PARENT_TRANSFORM: Transform2D = new Transform2D();
let PATCH_PARENT_ENTITY_ID: EntityId | null = null;

export const worldTransform2DSystem = createSystem("engine:worldTransform2D")({
  priority: -1_000_000,
  system() {
    syncWorldTransform2D(fromContext(ActiveRegistry));
  },
});

/**
 * Finalizes published local/topology changes into cached world transforms.
 * Sparse updates visit dirty subtrees; dense updates traverse each hierarchy once.
 */
export function syncWorldTransform2D(world: Registry): void {
  const state = transform2DTracker.getState(world);
  if (state.dirtyEntityIds.length === 0) {
    return;
  }

  COMPUTED_ENTITY_IDS.clear();
  const transformCount = world.getComponentCount(Transform2D);
  const hierarchyCount = world.getComponentCount(Parent);
  if (hierarchyCount === 0) {
    syncFlatWorld(world, state.dirtyEntityIds);
    state.dirtyEntityIds.length = 0;
    COMPUTED_ENTITY_IDS.clear();
    return;
  }

  DIRTY_ENTITY_IDS.clear();
  for (const entityId of state.dirtyEntityIds) {
    DIRTY_ENTITY_IDS.add(entityId);
  }

  const usesDenseTraversal = transformCount > 0
    && hierarchyCount / transformCount >= DENSE_DIRTY_RATIO
    && DIRTY_ENTITY_IDS.size / transformCount >= DENSE_DIRTY_RATIO;

  if (usesDenseTraversal) {
    syncDenseWorld(world, DIRTY_ENTITY_IDS);
  } else {
    syncSparseWorld(world, DIRTY_ENTITY_IDS);
  }

  state.dirtyEntityIds.length = 0;
  DIRTY_ENTITY_IDS.clear();
  COMPUTED_ENTITY_IDS.clear();
}

/** Immediately synchronizes one subtree for editor and other exact-current-value callers. */
export function syncWorldTransform2DSubtree(world: Registry, entityId: EntityId): void {
  const state = transform2DTracker.getState(world);
  COMPUTED_ENTITY_IDS.clear();
  if (syncEntityAncestors(world, entityId, 0)) {
    syncEntitySubtree(world, entityId, 0);
    consumeDirtyEntityId(state.dirtyEntityIds, entityId);
  }
  COMPUTED_ENTITY_IDS.clear();
}

function syncFlatWorld(world: Registry, dirtyEntityIds: readonly EntityId[]): void {
  for (const entityId of dirtyEntityIds) {
    syncEntitySubtree(world, entityId, 0);
  }
}

function syncSparseWorld(world: Registry, dirtyEntityIds: Set<EntityId>): void {
  for (const entityId of dirtyEntityIds) {
    if (hasDirtyAncestor(world, entityId, dirtyEntityIds)) {
      continue;
    }

    syncEntitySubtree(world, entityId, 0, dirtyEntityIds);
  }
}

function syncDenseWorld(world: Registry, dirtyEntityIds: Set<EntityId>): void {
  for (const entityId of dirtyEntityIds) {
    if (!world.has(entityId, Transform2D)) {
      invalidateWorldTransformSubtree(world, entityId);
    }
  }

  const transformEntityIds = world.getComponentEntityIds(Transform2D);
  for (const entityId of transformEntityIds) {
    const parentEntityId = world.get(entityId, Parent)?.entityId;
    if (parentEntityId !== undefined && world.has(parentEntityId, Transform2D)) {
      continue;
    }

    syncEntitySubtree(world, entityId, 0, dirtyEntityIds);
  }
}

function hasDirtyAncestor(
  world: Registry,
  entityId: EntityId,
  dirtyEntityIds: ReadonlySet<EntityId>,
): boolean {
  let parentEntityId = world.get(entityId, Parent)?.entityId;
  let depth = 0;

  while (parentEntityId !== undefined && depth <= MAX_WORLD_TRANSFORM_DEPTH) {
    if (dirtyEntityIds.has(parentEntityId)) {
      return true;
    }

    parentEntityId = world.get(parentEntityId, Parent)?.entityId;
    depth += 1;
  }

  return false;
}

function syncEntityAncestors(world: Registry, entityId: EntityId, depth: number): boolean {
  if (depth > MAX_WORLD_TRANSFORM_DEPTH) {
    invalidateWorldTransformSubtree(world, entityId);
    return false;
  }

  const localTransform = world.get(entityId, Transform2D);
  if (!localTransform) {
    invalidateWorldTransformSubtree(world, entityId);
    return false;
  }

  const parentEntityId = world.get(entityId, Parent)?.entityId ?? null;
  let parentWorldTransform: WorldTransform2D | undefined;
  if (parentEntityId !== null) {
    if (!syncEntityAncestors(world, parentEntityId, depth + 1)) {
      invalidateWorldTransformSubtree(world, entityId);
      return false;
    }

    parentWorldTransform = world.get(parentEntityId, WorldTransform2D);
    if (!parentWorldTransform) {
      invalidateWorldTransformSubtree(world, entityId);
      return false;
    }
  }

  writeWorldTransform(world, entityId, localTransform, parentWorldTransform, parentEntityId);
  COMPUTED_ENTITY_IDS.add(entityId);
  return true;
}

function syncEntitySubtree(
  world: Registry,
  entityId: EntityId,
  depth: number,
  consumedDirtyEntityIds?: Set<EntityId>,
): boolean {
  consumedDirtyEntityIds?.delete(entityId);
  if (COMPUTED_ENTITY_IDS.has(entityId)) {
    return syncChildren(world, entityId, depth, consumedDirtyEntityIds);
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

  const parentEntityId = world.get(entityId, Parent)?.entityId ?? null;
  let parentWorldTransform: WorldTransform2D | undefined;

  if (parentEntityId !== null) {
    parentWorldTransform = world.get(parentEntityId, WorldTransform2D);
    if (!parentWorldTransform && !syncEntitySubtree(world, parentEntityId, depth + 1)) {
      invalidateWorldTransformSubtree(world, entityId);
      return false;
    }

    parentWorldTransform = world.get(parentEntityId, WorldTransform2D);
    if (!parentWorldTransform) {
      invalidateWorldTransformSubtree(world, entityId);
      return false;
    }
  }

  writeWorldTransform(world, entityId, localTransform, parentWorldTransform, parentEntityId);
  COMPUTED_ENTITY_IDS.add(entityId);

  const childEntityIds = world.getChildren(entityId);
  if (!childEntityIds) {
    return true;
  }

  for (const childEntityId of childEntityIds) {
    syncEntitySubtree(world, childEntityId, depth + 1, consumedDirtyEntityIds);
  }

  return true;
}

function consumeDirtyEntityId(dirtyEntityIds: EntityId[], consumedEntityId: EntityId): void {
  let writeIndex = 0;
  for (const entityId of dirtyEntityIds) {
    if (entityId === consumedEntityId) {
      continue;
    }

    dirtyEntityIds[writeIndex] = entityId;
    writeIndex += 1;
  }
  dirtyEntityIds.length = writeIndex;
}

function syncChildren(
  world: Registry,
  entityId: EntityId,
  depth: number,
  consumedDirtyEntityIds?: Set<EntityId>,
): boolean {
  const childEntityIds = world.getChildren(entityId);
  if (!childEntityIds) {
    return true;
  }

  for (const childEntityId of childEntityIds) {
    syncEntitySubtree(world, childEntityId, depth + 1, consumedDirtyEntityIds);
  }

  return true;
}

function writeWorldTransform(
  world: Registry,
  entityId: EntityId,
  localTransform: Transform2D,
  parentWorldTransform: WorldTransform2D | undefined,
  parentEntityId: EntityId | null,
): void {
  PATCH_LOCAL_TRANSFORM = localTransform;
  PATCH_PARENT_TRANSFORM = parentWorldTransform ?? localTransform;
  PATCH_PARENT_ENTITY_ID = parentEntityId;

  let worldTransform = world.tryPatch(entityId, WorldTransform2D, PATCH_WORLD_TRANSFORM);
  if (!worldTransform) {
    worldTransform = new WorldTransform2D();
    PATCH_WORLD_TRANSFORM(worldTransform);
    world.add(entityId, worldTransform);
  }

  transform2DTracker.markWorldNeedsSnapshot(world, worldTransform);
}

const PATCH_WORLD_TRANSFORM = (worldTransform: WorldTransform2D): void => {
  worldTransform.parentEntityId = PATCH_PARENT_ENTITY_ID;
  if (PATCH_PARENT_ENTITY_ID === null) {
    copyTransform2D(worldTransform, PATCH_LOCAL_TRANSFORM);
    return;
  }

  composeWorldTransform2D(worldTransform, PATCH_PARENT_TRANSFORM, PATCH_LOCAL_TRANSFORM);
};

function invalidateWorldTransformSubtree(
  world: Registry,
  entityId: EntityId,
): void {
  INVALIDATION_STACK.length = 0;
  INVALIDATION_STACK.push(entityId);

  while (INVALIDATION_STACK.length > 0) {
    const currentEntityId = INVALIDATION_STACK.pop();
    if (currentEntityId === undefined) {
      continue;
    }

    const childEntityIds = world.getChildren(currentEntityId);
    if (childEntityIds) {
      for (const childEntityId of childEntityIds) {
        INVALIDATION_STACK.push(childEntityId);
      }
    }

    if (world.has(currentEntityId, WorldTransform2D)) {
      world.remove(currentEntityId, WorldTransform2D);
    }
  }

  INVALIDATION_STACK.length = 0;
}
