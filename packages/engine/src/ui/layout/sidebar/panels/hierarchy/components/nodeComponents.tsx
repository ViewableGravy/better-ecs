import type { ComponentTreeNode } from "@ui/layout/sidebar/panels/hierarchy/queries/hierarchyTreeQuery";
import styles from "@ui/layout/sidebar/styles.module.css";
import { Dropdown } from "@ui/layout/sidebar/worldViewer/dropdown";
import { EntityRow } from "@ui/layout/sidebar/worldViewer/entityRow";
import React from "react";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/
type NodeComponentsProps = {
  components: ComponentTreeNode[];
  depth: number;
};

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/
export const NodeComponents: React.FC<NodeComponentsProps> = React.memo(({ components, depth }) => {
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
});
