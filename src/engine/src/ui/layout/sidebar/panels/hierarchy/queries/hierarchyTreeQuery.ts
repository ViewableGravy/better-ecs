import { Debug, EditorHoverHighlight, Gizmo, Parent } from "@engine/components";
import type { EntityId } from "@engine/ecs/entity";
import type { Registry } from "@engine/ecs/registry";
import { type EngineUiContextValue } from "@engine/ui/utilities/engine-context";
import { createQueryOptions } from "@engine/ui/utilities/query/create-query-options";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/
export type ComponentTreeNode = {
  key: string;
  name: string;
};

export type HierarchyEntityNode = {
  debugName: string | null;
  childEntityIds: EntityId[];
  components: ComponentTreeNode[];
};

export type HierarchyRegistryTree = {
  rootEntityIds: EntityId[];
  expandedEntityIds: EntityId[];
  entitiesById: Record<string, HierarchyEntityNode>;
};

export type HierarchyTreeSnapshot = {
  activeSceneName: string | null;
  registry: HierarchyRegistryTree;
};

const HIERARCHY_TREE_QUERY_KEY = ["engine-ui", "hierarchy-tree"] as const;
const POLLING_INTERVAL_MS = 250;
const SNAPSHOT_CACHE = new WeakMap<EngineUiContextValue, HierarchyTreeSnapshot>();

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/
export const createHierarchyTreeQueryOptions = (engine: EngineUiContextValue) => {
  return createQueryOptions({
    queryKey: HIERARCHY_TREE_QUERY_KEY,
    queryFn: () => {
      const previousSnapshot = SNAPSHOT_CACHE.get(engine);
      const nextSnapshot = buildHierarchyTreeSnapshot(engine, previousSnapshot);
      SNAPSHOT_CACHE.set(engine, nextSnapshot);
      return nextSnapshot;
    },
    refetchInterval: POLLING_INTERVAL_MS,
  });
};

/**********************************************************************************************************
 *   QUERY FUNCTION
 **********************************************************************************************************/
function buildHierarchyTreeSnapshot(
  engine: EngineUiContextValue,
  previousSnapshot?: HierarchyTreeSnapshot,
): HierarchyTreeSnapshot {
  const nextRegistryTree = buildRegistryTree(engine.scene.registry, previousSnapshot?.registry);

  if (
    previousSnapshot &&
    previousSnapshot.activeSceneName === engine.scene.activeSceneName &&
    previousSnapshot.registry === nextRegistryTree
  ) {
    return previousSnapshot;
  }

  return {
    activeSceneName: engine.scene.activeSceneName,
    registry: nextRegistryTree,
  };
}

function buildRegistryTree(
  registry: Registry,
  previousRegistryTree?: HierarchyRegistryTree,
): HierarchyRegistryTree {
  const allEntityIds = registry
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
    visibleEntityIds.push(entityId);
    visibleEntityIdSet.add(entityId);

    if (gizmoEntityId === null && registry.has(entityId, Gizmo)) {
      gizmoEntityId = entityId;
    }
  }

  for (const entityId of visibleEntityIds) {
    const parentId = registry.get(entityId, Parent)?.entityId;
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
  const stableRootEntityIds = reuseArray(previousRegistryTree?.rootEntityIds, rootEntityIds);

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
  let hasEntityNodeChanges = previousRegistryTree === undefined;

  for (const entityId of visibleEntityIds) {
    const entityIdKey = entityId.toString();
    const previousNode = previousRegistryTree?.entitiesById[entityIdKey];
    const debugName = registry.get(entityId, Debug)?.name ?? null;
    const components = registry
      .getComponentTypes(entityId)
      .filter((componentType) => componentType !== EditorHoverHighlight)
      .map((componentType) => ({
        key: `${entityId}:${componentType.name}`,
        name: componentType.name,
      }))
      .sort((left, right) => left.name.localeCompare(right.name));

    const nextChildEntityIds = childEntityIdsByParent.get(entityId) ?? [];
    const stableChildEntityIds = reuseArray(previousNode?.childEntityIds, nextChildEntityIds);
    const stableComponents = reuseComponents(previousNode?.components, components);

    if (
      previousNode &&
      previousNode.debugName === debugName &&
      previousNode.childEntityIds === stableChildEntityIds &&
      previousNode.components === stableComponents
    ) {
      entitiesById[entityIdKey] = previousNode;
    } else {
      entitiesById[entityIdKey] = {
        debugName,
        childEntityIds: stableChildEntityIds,
        components: stableComponents,
      };
      hasEntityNodeChanges = true;
    }
  }

  const stableExpandedEntityIds = reuseArray(previousRegistryTree?.expandedEntityIds, expandedEntityIds);

  if (
    previousRegistryTree &&
    !hasEntityNodeChanges &&
    Object.keys(previousRegistryTree.entitiesById).length === visibleEntityIds.length &&
    previousRegistryTree.rootEntityIds === stableRootEntityIds &&
    previousRegistryTree.expandedEntityIds === stableExpandedEntityIds
  ) {
    return previousRegistryTree;
  }

  return {
    rootEntityIds: stableRootEntityIds,
    expandedEntityIds: stableExpandedEntityIds,
    entitiesById,
  };
}

function reuseArray<T>(previous: T[] | undefined, next: T[]): T[] {
  if (!previous || previous.length !== next.length) {
    return next;
  }

  for (let index = 0; index < next.length; index += 1) {
    if (previous[index] !== next[index]) {
      return next;
    }
  }

  return previous;
}

function reuseComponents(
  previous: ComponentTreeNode[] | undefined,
  next: ComponentTreeNode[],
): ComponentTreeNode[] {
  if (!previous || previous.length !== next.length) {
    return next;
  }

  for (let index = 0; index < next.length; index += 1) {
    const previousComponent = previous[index];
    const nextComponent = next[index];

    if (
      previousComponent.key !== nextComponent.key ||
      previousComponent.name !== nextComponent.name
    ) {
      return next;
    }
  }

  return previous;
}

/**********************************************************************************************************
 *   SELECTORS
 **********************************************************************************************************/
