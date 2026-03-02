import type { EntityId } from "@engine/ecs/entity";
import { useQuery } from "@tanstack/react-query";
import {
  createHierarchyTreeQueryOptions,
  type HierarchyTreeSnapshot,
} from "@engine/ui/layout/sidebar/panels/hierarchy/queries/hierarchyTreeQuery";
import { WorldIdContext } from "@engine/ui/layout/sidebar/worldViewer/context";
import { EngineUiContext } from "@engine/ui/utilities/engine-context";
import { useInvariantContext } from "@engine/ui/utilities/hooks/use-invariant-context";
import { useCallback } from "react";
import { EntityTreeNodes } from "@engine/ui/layout/sidebar/panels/hierarchy/components/entityTreeNodes";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/
const EMPTY_ENTITY_IDS: EntityId[] = [];

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/
export const WorldEntitiesDropdown: React.FC = () => {
  /***** HOOKS *****/
  const engine = useInvariantContext(EngineUiContext);
  const worldId = useInvariantContext(WorldIdContext);

  /***** QUERIES *****/
  const { data } = useQuery({
    ...createHierarchyTreeQueryOptions(engine),
    select: useCallback((snapshot: HierarchyTreeSnapshot) => {
      return {
        rootEntityIds: snapshot.worldsById[worldId]?.rootEntityIds,
        expandedEntityIds: snapshot.worldsById[worldId]?.expandedEntityIds,
      };
    }, [worldId]),
  });

  /***** RENDER *****/
  return (
    <EntityTreeNodes
      depth={1}
      expandedEntityIds={data?.expandedEntityIds ?? EMPTY_ENTITY_IDS}
      entityIds={data?.rootEntityIds ?? EMPTY_ENTITY_IDS}
    />
  );
};
