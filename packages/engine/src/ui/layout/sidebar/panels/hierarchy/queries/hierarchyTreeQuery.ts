import { Gizmo, Parent } from "@/components";
import type { EntityId } from "@/ecs/entity";
import type { UserWorld } from "@/ecs/world";
import { EditorDebugEntity } from "@ui/layout/sidebar/worldViewer/editorDebugEntity";
import { type EngineUiContextValue } from "@ui/utilities/engine-context";
import { createQueryOptions } from "@ui/utilities/query/create-query-options";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/
export type ComponentTreeNode = {
  key: string;
  name: string;
};

export type HierarchyEntityNode = {
  childEntityIds: EntityId[];
  components: ComponentTreeNode[];
};

export type HierarchyWorldTree = {
  rootEntityIds: EntityId[];
  expandedEntityIds: EntityId[];
  entitiesById: Record<string, HierarchyEntityNode>;
};

export type HierarchyTreeSnapshot = {
  activeSceneName: string | null;
  activeWorldId: string | null;
  worldIds: string[];
  worldsById: Record<string, HierarchyWorldTree>;
};

const HIERARCHY_TREE_QUERY_KEY = ["engine-ui", "hierarchy-tree"] as const;
const POLLING_INTERVAL_MS = 250;

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/
export const createHierarchyTreeQueryOptions = (engine: EngineUiContextValue) => {
  return createQueryOptions({
    queryKey: HIERARCHY_TREE_QUERY_KEY,
    queryFn: () => buildHierarchyTreeSnapshot(engine),
    refetchInterval: POLLING_INTERVAL_MS,
  });
};

/**********************************************************************************************************
 *   QUERY FUNCTION
 **********************************************************************************************************/
function buildHierarchyTreeSnapshot(engine: EngineUiContextValue): HierarchyTreeSnapshot {
  const worldIds: string[] = [];
  const worldsById: Record<string, HierarchyWorldTree> = {};

  for (const [worldId] of engine.scene.context.worldEntries) {
    worldIds.push(worldId);
  }

  worldIds.sort((left, right) => left.localeCompare(right));

  for (const worldId of worldIds) {
    const world = engine.scene.context.requireWorld(worldId);
    worldsById[worldId] = buildWorldTree(world);
  }

  return {
    activeSceneName: engine.scene.activeSceneName,
    activeWorldId: engine.scene.activeWorldId,
    worldIds,
    worldsById,
  };
}

function buildWorldTree(world: UserWorld): HierarchyWorldTree {
  const allEntityIds = world
    .all()
    .slice()
    .sort((left, right) => left - right);

  const visibleEntityIds: EntityId[] = [];
  const visibleEntityIdSet = new Set<EntityId>();
  const parentByEntityId = new Map<EntityId, EntityId>();
  const childEntityIdsByParent = new Map<EntityId, EntityId[]>();
  const rootEntityIds: EntityId[] = [];
  let gizmoEntityId: EntityId | null = null;

  for (const entityId of allEntityIds) {
    if (world.has(entityId, EditorDebugEntity)) {
      continue;
    }

    visibleEntityIds.push(entityId);
    visibleEntityIdSet.add(entityId);

    if (gizmoEntityId === null && world.has(entityId, Gizmo)) {
      gizmoEntityId = entityId;
    }
  }

  for (const entityId of visibleEntityIds) {
    const parentId = world.get(entityId, Parent)?.entityId;
    if (parentId !== undefined) {
      parentByEntityId.set(entityId, parentId);
    }

    if (
      parentId === undefined ||
      parentId === entityId ||
      !visibleEntityIdSet.has(parentId)
    ) {
      rootEntityIds.push(entityId);
      continue;
    }

    const childEntityIds = childEntityIdsByParent.get(parentId);
    if (childEntityIds) {
      childEntityIds.push(entityId);
      continue;
    }

    childEntityIdsByParent.set(parentId, [entityId]);
  }

  for (const childEntityIds of childEntityIdsByParent.values()) {
    childEntityIds.sort((left, right) => left - right);
  }

  rootEntityIds.sort((left, right) => left - right);

  const expandedEntityIds: EntityId[] = [];
  if (gizmoEntityId !== null) {
    const visited = new Set<EntityId>();
    let currentEntityId: EntityId | undefined = gizmoEntityId;

    while (currentEntityId !== undefined && !visited.has(currentEntityId)) {
      visited.add(currentEntityId);

      if (visibleEntityIdSet.has(currentEntityId)) {
        expandedEntityIds.push(currentEntityId);
      }

      const parentId = parentByEntityId.get(currentEntityId);
      if (parentId === undefined || parentId === currentEntityId) {
        break;
      }

      currentEntityId = parentId;
    }
  }

  const entitiesById: Record<string, HierarchyEntityNode> = {};

  for (const entityId of visibleEntityIds) {
    const components = world
      .getComponentTypes(entityId)
      .map((componentType) => ({
        key: `${entityId}:${componentType.name}`,
        name: componentType.name,
      }))
      .sort((left, right) => left.name.localeCompare(right.name));

    const childEntityIds = childEntityIdsByParent.get(entityId) ?? [];

    entitiesById[entityId.toString()] = {
      childEntityIds,
      components,
    };
  }

  return {
    rootEntityIds,
    expandedEntityIds,
    entitiesById,
  };
}

/**********************************************************************************************************
 *   SELECTORS
 **********************************************************************************************************/
