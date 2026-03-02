import type { EntityId } from "@engine/ecs/entity";
import styles from "@engine/ui/layout/sidebar/styles.module.css";
import { EntityIdContext } from "@engine/ui/layout/sidebar/worldViewer/context";
import React from "react";
import { EntityTreeNode } from "@engine/ui/layout/sidebar/panels/hierarchy/components/entityTreeNode";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/
type EntityTreeNodesProps = {
  entityIds: EntityId[];
  depth?: number;
  expandedEntityIds?: ReadonlyArray<EntityId>;
};

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/
export const EntityTreeNodes: React.FC<EntityTreeNodesProps> = React.memo(({
  entityIds,
  depth = 0,
  expandedEntityIds,
}) => {
  /***** RENDER *****/
  if (!entityIds.length) {
    return null;
  }

  return (
    <ul className={styles.worldsEntitiesNestedEntityList}>
      {entityIds.map((entityId) => (
        <EntityIdContext key={entityId.toString()} value={entityId}>
          <EntityTreeNode depth={depth} expandedEntityIds={expandedEntityIds} />
        </EntityIdContext>
      ))}
    </ul>
  );
});
