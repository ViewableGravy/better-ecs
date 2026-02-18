import styles from "../styles.module.css";
import { EntityIdContext } from "./context";
import { DebugHover } from "./debugHover";
import { Dropdown } from "./dropdown";
import type { EntityTreeNode } from "./entityItemList";
import { EntityRow } from "./entityRow";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/
type EntityTreeNodes = React.FC<{
  nodes: EntityTreeNode[];
  depth?: number;
}>;

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/
export const EntityTreeNodes: EntityTreeNodes = ({ nodes, depth = 0 }) => {
  /***** RENDER *****/
  if (!nodes.length) {
    return null;
  }

  return (
    <ul className={styles.worldsEntitiesNestedEntityList}>
      {nodes.map((node) => (
        <EntityIdContext value={node.entityId} key={node.entityId.toString()}>
          <li className={styles.worldsEntitiesEntityItem}>
            <DebugHover>
              <Dropdown.Manager>
                <EntityRow.DropdownButton depth={depth} hasContent={node.children.length > 0}>
                  <EntityRow.Root>
                    <EntityRow.TypeIcon />
                    <EntityRow.DebugName />
                    <EntityRow.Actions>
                      <EntityRow.Delete />
                    </EntityRow.Actions>
                  </EntityRow.Root>
                </EntityRow.DropdownButton>
                <Dropdown.Content>
                  <EntityTreeNodes depth={depth + 1} nodes={node.children} />
                </Dropdown.Content>
              </Dropdown.Manager>
            </DebugHover>
          </li>
        </EntityIdContext>
      ))}
    </ul>
  );
};