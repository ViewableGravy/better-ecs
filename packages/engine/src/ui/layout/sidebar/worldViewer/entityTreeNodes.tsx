import type { EntityId } from "@/ecs/entity";
import styles from "@ui/layout/sidebar/styles.module.css";
import { EntityIdContext } from "@ui/layout/sidebar/worldViewer/context";
import { DebugHover } from "@ui/layout/sidebar/worldViewer/debugHover";
import { Dropdown } from "@ui/layout/sidebar/worldViewer/dropdown";
import type { EntityTreeNode } from "@ui/layout/sidebar/worldViewer/entityItemList";
import { EntityRow } from "@ui/layout/sidebar/worldViewer/entityRow";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/
type EntityTreeNodesProps = {
  nodes: EntityTreeNode[];
  depth?: number;
  expandedEntityIds?: ReadonlyArray<EntityId>;
};

type NodeComponentsProps = {
  components: EntityTreeNode["components"];
  depth: number;
};

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/
const NodeComponents: React.FC<NodeComponentsProps> = ({ components, depth }) => {
  /***** RENDER *****/
  if (!components.length) {
    return null;
  }

  return (
    <ul className={styles.worldsEntitiesNestedEntityList}>
      {components.map((component) => (
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
  );
};

export const EntityTreeNodes: React.FC<EntityTreeNodesProps> = ({
  nodes,
  depth = 0,
  expandedEntityIds,
}) => {
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
              <Dropdown.Manager forceExpanded={expandedEntityIds?.includes(node.entityId)}>
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
                  <EntityTreeNodes
                    depth={depth + 1}
                    expandedEntityIds={expandedEntityIds}
                    nodes={node.children}
                  />
                  <NodeComponents components={node.components} depth={depth} />
                </Dropdown.Content>
              </Dropdown.Manager>
            </DebugHover>
          </li>
        </EntityIdContext>
      ))}
    </ul>
  );
};
