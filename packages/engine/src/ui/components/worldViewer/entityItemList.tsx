import { Parent } from "../../../components";
import type { EntityId } from "../../../ecs/entity";
import { EngineUiContext } from "../../utilities/engine-context";
import { useIntervalState } from "../../utilities/hooks/use-interval-state";
import { useInvariantContext } from "../../utilities/hooks/use-invariant-context";
import { WorldIdContext } from "./context";
import { EditorDebugEntity } from "./editorDebugEntity";
import { EntityTreeNodes } from "./entityTreeNodes";

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
    // Retrieve the world, and sort numerically
    const world = engine.scene.context.requireWorld(worldId);
    const entityIds = world
      .all()
      .slice()
      .sort((left, right) => left - right);

    const nodesById = new Map<EntityId, EntityTreeNode>();
    const roots: EntityTreeNode[] = [];

    // 1. Add all entities to the node map
    for (const entityId of entityIds) {
      // skip debug entity
      if (world.has(entityId, EditorDebugEntity))
        continue;

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

    // 2. Link entities to parents and identify roots
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
