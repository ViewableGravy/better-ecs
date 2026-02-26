import { WorldIdContext } from "@ui/layout/sidebar/worldViewer/context";
import { EditorDebugEntity } from "@ui/layout/sidebar/worldViewer/editorDebugEntity";
import { EntityTreeNodes } from "@ui/layout/sidebar/worldViewer/entityTreeNodes";
import { EngineUiContext } from "@ui/utilities/engine-context";
import { useIntervalState } from "@ui/utilities/hooks/use-interval-state";
import { useInvariantContext } from "@ui/utilities/hooks/use-invariant-context";
import { Gizmo, Parent } from "@repo/engine/components";
import type { EntityId } from "@repo/engine";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/
export type EntityTreeNode = {
  entityId: EntityId;
  children: EntityTreeNode[];
  components: ComponentTreeNode[];
};

export type ComponentTreeNode = {
  key: string;
  name: string;
};

type EntityTreeData = {
  roots: EntityTreeNode[];
  expandedEntityIds: EntityId[];
};

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/
export const WorldEntitiesDropdown = () => {
  /***** HOOKS *****/
  const engine = useInvariantContext(EngineUiContext);
  const worldId = useInvariantContext(WorldIdContext);

  /***** HOOKS *****/
  const entityTree = useIntervalState(500, () => {
    const world = engine.scene.context.requireWorld(worldId);
    const entityIds = world
      .all()
      .slice()
      .sort((left, right) => left - right);

    const nodesById = new Map<EntityId, EntityTreeNode>();
    const parentById = new Map<EntityId, EntityId>();
    const roots: EntityTreeNode[] = [];
    let gizmoEntityId: EntityId | null = null;

    for (const entityId of entityIds) {
      if (world.has(entityId, EditorDebugEntity)) {
        continue;
      }

      nodesById.set(entityId, {
        entityId,
        children: [],
        components: world
          .getComponentTypes(entityId)
          .map((componentType) => ({
            key: `${entityId}:${componentType.name}`,
            name: componentType.name,
          }))
          .sort((left, right) => left.name.localeCompare(right.name)),
      });

      if (gizmoEntityId === null && world.has(entityId, Gizmo)) {
        gizmoEntityId = entityId;
      }
    }

    for (const entityId of entityIds) {
      const node = nodesById.get(entityId);
      if (!node) {
        continue;
      }

      const parentId = world.get(entityId, Parent)?.entityId;
      if (parentId !== undefined) {
        parentById.set(entityId, parentId);
      }

      if (parentId === undefined || parentId === entityId) {
        roots.push(node);
        continue;
      }

      const parent = nodesById.get(parentId);
      if (!parent) {
        roots.push(node);
        continue;
      }

      parent.children.push(node);
    }

    const expandedEntityIds: EntityId[] = [];
    if (gizmoEntityId !== null) {
      const visited = new Set<EntityId>();
      let currentEntityId: EntityId | undefined = gizmoEntityId;

      while (currentEntityId !== undefined && !visited.has(currentEntityId)) {
        visited.add(currentEntityId);

        if (nodesById.has(currentEntityId)) {
          expandedEntityIds.push(currentEntityId);
        }

        const parentId = parentById.get(currentEntityId);
        if (parentId === undefined || parentId === currentEntityId) {
          break;
        }

        currentEntityId = parentId;
      }
    }

    const treeData: EntityTreeData = {
      roots,
      expandedEntityIds,
    };

    return treeData;
  });

  /***** RENDER *****/
  return (
    <EntityTreeNodes
      depth={1}
      expandedEntityIds={entityTree.expandedEntityIds}
      nodes={entityTree.roots}
    />
  );
};
