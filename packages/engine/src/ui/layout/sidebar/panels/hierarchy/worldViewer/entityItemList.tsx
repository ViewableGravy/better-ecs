import { Parent } from "@ui/layout/components";
import type { EntityId } from "@ui/layout/ecs/entity";
import { EngineUiContext } from "@ui/layout/sidebar/utilities/engine-context";
import { useIntervalState } from "@ui/layout/sidebar/utilities/hooks/use-interval-state";
import { useInvariantContext } from "@ui/layout/sidebar/utilities/hooks/use-invariant-context";
import { WorldIdContext } from "@ui/layout/sidebar/panels/hierarchy/worldViewer/context";
import { EditorDebugEntity } from "@ui/layout/sidebar/panels/hierarchy/worldViewer/editorDebugEntity";
import { EntityTreeNodes } from "@ui/layout/sidebar/panels/hierarchy/worldViewer/entityTreeNodes";

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
    const roots: EntityTreeNode[] = [];

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
    }

    for (const entityId of entityIds) {
      const node = nodesById.get(entityId);
      if (!node) {
        continue;
      }

      const parentId = world.get(entityId, Parent)?.entityId;
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

    return roots;
  });

  /***** RENDER *****/
  return <EntityTreeNodes depth={1} nodes={entityTree} />;
};
