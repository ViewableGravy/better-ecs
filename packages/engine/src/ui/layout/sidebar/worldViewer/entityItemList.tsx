import { Gizmo, Parent } from "@/components";
import type { EntityId } from "@/ecs/entity";
import { WorldIdContext } from "@ui/layout/sidebar/worldViewer/context";
import { EditorDebugEntity } from "@ui/layout/sidebar/worldViewer/editorDebugEntity";
import { EntityTreeNodes } from "@ui/layout/sidebar/worldViewer/entityTreeNodes";
import { EngineUiContext } from "@ui/utilities/engine-context";
import { useInvariantContext } from "@ui/utilities/hooks/use-invariant-context";
import { useSubscribableSelector } from "@ui/utilities/hooks/use-subscribable-selector";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/
export type ComponentTreeNode = {
  key: string;
  name: string;
};

type EntityTreeData = {
  rootEntityIds: EntityId[];
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
  const world = engine.scene.context.requireWorld(worldId);
  const entityTree = useSubscribableSelector(world, (currentWorld): EntityTreeData => {
    const entityIds = currentWorld
      .all()
      .slice()
      .sort((left, right) => left - right);

    const visibleEntityIds: EntityId[] = [];
    const visibleEntityIdsSet = new Set<EntityId>();
    const parentById = new Map<EntityId, EntityId>();
    const rootEntityIds: EntityId[] = [];
    let gizmoEntityId: EntityId | null = null;

    for (const entityId of entityIds) {
      if (currentWorld.has(entityId, EditorDebugEntity)) {
        continue;
      }

      visibleEntityIds.push(entityId);
      visibleEntityIdsSet.add(entityId);

      if (gizmoEntityId === null && currentWorld.has(entityId, Gizmo)) {
        gizmoEntityId = entityId;
      }
    }

    for (const entityId of visibleEntityIds) {
      const parentId = currentWorld.get(entityId, Parent)?.entityId;
      if (parentId !== undefined) {
        parentById.set(entityId, parentId);
      }

      if (parentId === undefined || parentId === entityId) {
        rootEntityIds.push(entityId);
        continue;
      }

      if (!visibleEntityIdsSet.has(parentId)) {
        rootEntityIds.push(entityId);
        continue;
      }
    }

    const expandedEntityIds: EntityId[] = [];
    if (gizmoEntityId !== null) {
      const visited = new Set<EntityId>();
      let currentEntityId: EntityId | undefined = gizmoEntityId;

      while (currentEntityId !== undefined && !visited.has(currentEntityId)) {
        visited.add(currentEntityId);

        if (visibleEntityIdsSet.has(currentEntityId)) {
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
      rootEntityIds,
      expandedEntityIds,
    };

    return treeData;
  });

  /***** RENDER *****/
  return (
    <EntityTreeNodes
      depth={1}
      expandedEntityIds={entityTree.expandedEntityIds}
      entityIds={entityTree.rootEntityIds}
      world={world}
    />
  );
};
