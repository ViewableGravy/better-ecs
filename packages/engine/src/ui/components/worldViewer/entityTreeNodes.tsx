import styles from '../styles.module.css';
import { EntityIdContext } from "./context";
import { EntityItem } from "./entityItem";
import type { EntityTreeNode } from "./entityItemList";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/
type EntityTreeNodes = React.FC<{
  nodes: EntityTreeNode[];
}>;

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/
export const EntityTreeNodes: EntityTreeNodes = ({ nodes }) => {
  /***** RENDER *****/
  if (!nodes.length) {
    return null;
  }

  return (
    <ul className={styles.worldsEntitiesNestedEntityList}>
      {nodes.map(({ entityId, children }) => (
        <EntityIdContext value={entityId} key={entityId.toString()}>
          <EntityItem />
          <EntityTreeNodes nodes={children} />
        </EntityIdContext>
      ))}
    </ul>
  );
};