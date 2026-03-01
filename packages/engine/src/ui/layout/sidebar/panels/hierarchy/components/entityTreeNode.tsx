import type { EntityId } from "@/ecs/entity";
import { useQuery } from "@tanstack/react-query";
import { EntityTreeNodes } from "@ui/layout/sidebar/panels/hierarchy/components/entityTreeNodes";
import { NodeComponents } from "@ui/layout/sidebar/panels/hierarchy/components/nodeComponents";
import {
    createHierarchyTreeQueryOptions,
    type ComponentTreeNode,
    type HierarchyEntityNode,
    type HierarchyTreeSnapshot,
} from "@ui/layout/sidebar/panels/hierarchy/queries/hierarchyTreeQuery";
import styles from "@ui/layout/sidebar/styles.module.css";
import { EntityIdContext, WorldIdContext } from "@ui/layout/sidebar/worldViewer/context";
import { DebugHover } from "@ui/layout/sidebar/worldViewer/debugHover";
import { Dropdown } from "@ui/layout/sidebar/worldViewer/dropdown";
import { EntityRow } from "@ui/layout/sidebar/worldViewer/entityRow";
import { EngineUiContext } from "@ui/utilities/engine-context";
import { useInvariantContext } from "@ui/utilities/hooks/use-invariant-context";
import React, { useCallback } from "react";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/
type EntityTreeNodeProps = {
  depth: number;
  expandedEntityIds?: ReadonlyArray<EntityId>;
};

const EMPTY_ENTITY_IDS: EntityId[] = [];
const EMPTY_COMPONENTS: ComponentTreeNode[] = [];

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/
export const EntityTreeNode: React.FC<EntityTreeNodeProps> = React.memo(({
  depth,
  expandedEntityIds,
}) => {
  /***** HOOKS *****/
  const engine = useInvariantContext(EngineUiContext);
  const worldId = useInvariantContext(WorldIdContext);
  const entityId = useInvariantContext(EntityIdContext);

  /***** QUERIES *****/
  const { data: nodeData } = useQuery({
    ...createHierarchyTreeQueryOptions(engine),
    select: useCallback((snapshot: HierarchyTreeSnapshot): HierarchyEntityNode | null => {
      const worldTree = snapshot.worldsById[worldId];
      if (!worldTree) {
        return null;
      }

      return worldTree.entitiesById[entityId.toString()] ?? null;
    }, [entityId, worldId]),
  });

  /***** RENDER HELPERS *****/
  const childEntityIds = nodeData?.childEntityIds ?? EMPTY_ENTITY_IDS;
  const components = nodeData?.components ?? EMPTY_COMPONENTS;
  const hasContent = childEntityIds.length > 0 || components.length > 0;

  /***** RENDER *****/
  return (
    <li className={styles.worldsEntitiesEntityItem}>
      <DebugHover>
        <Dropdown.Manager forceExpanded={expandedEntityIds?.includes(entityId)}>
          <EntityRow.DropdownButton depth={depth} hasContent={hasContent}>
            <EntityRow.Root>
              <EntityRow.Icon.Entity />
              <EntityRow.DebugName name={nodeData?.debugName} />
              <EntityRow.Actions>
                <EntityRow.CenterCamera />
                <EntityRow.Delete />
              </EntityRow.Actions>
            </EntityRow.Root>
          </EntityRow.DropdownButton>

          {hasContent && (
            <Dropdown.Content>
              <EntityTreeNodes
                depth={depth + 1}
                entityIds={childEntityIds}
                expandedEntityIds={expandedEntityIds}
              />
              <NodeComponents components={components} depth={depth} />
            </Dropdown.Content>
          )}
        </Dropdown.Manager>
      </DebugHover>
    </li>
  );
});
