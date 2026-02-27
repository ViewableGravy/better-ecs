import type { EntityId } from "@/ecs/entity";
import styles from "@ui/layout/sidebar/styles.module.css";
import { EntityIdContext } from "@ui/layout/sidebar/worldViewer/context";
import { EntityTreeNode } from "./entityTreeNode";

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
export const EntityTreeNodes: React.FC<EntityTreeNodesProps> = ({
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
};
