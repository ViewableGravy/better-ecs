import styles from "@ui/layout/sidebar/panels/hierarchy/styles.module.css";
import { EntityIdContext } from "@ui/layout/sidebar/panels/hierarchy/worldViewer/context";
import { DebugHover } from "@ui/layout/sidebar/panels/hierarchy/worldViewer/debugHover";
import { Dropdown } from "@ui/layout/sidebar/panels/hierarchy/worldViewer/dropdown";
import type { EntityTreeNode } from "@ui/layout/sidebar/panels/hierarchy/worldViewer/entityItemList";
import { EntityRow } from "@ui/layout/sidebar/panels/hierarchy/worldViewer/entityRow";

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
                <EntityRow.DropdownButton
                  depth={depth}
                  hasContent={node.children.length > 0 || node.components.length > 0}
                >
                  <EntityRow.Root>
                    <EntityRow.Icon.Entity />
                    <EntityRow.DebugName />
                    <EntityRow.Actions>
                      <EntityRow.Delete />
                    </EntityRow.Actions>
                  </EntityRow.Root>
                </EntityRow.DropdownButton>
                <Dropdown.Content>
                  <EntityTreeNodes depth={depth + 1} nodes={node.children} />
                  {node.components && node.components.length > 0 && (
                    <ul className={styles.worldsEntitiesNestedEntityList}>
                      {node.components.map((component) => (
                        <li className={styles.worldsEntitiesEntityItem} key={component.key}>
                          <Dropdown.Manager>
                            <EntityRow.DropdownButton depth={depth + 1} hasContent={false}>
                              <EntityRow.Root>
                                <EntityRow.Icon.Component />
                                <span className={styles.worldsEntitiesEntityName}>{component.name}</span>
                              </EntityRow.Root>
                            </EntityRow.DropdownButton>
                          </Dropdown.Manager>
                        </li>
                      ))}
                    </ul>
                  )}
                </Dropdown.Content>
              </Dropdown.Manager>
            </DebugHover>
          </li>
        </EntityIdContext>
      ))}
    </ul>
  );
};
