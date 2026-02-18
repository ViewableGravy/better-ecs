import React from "react";
import styles from "./styles.module.css";
import { Dropdown } from "./worldViewer/dropdown";
import { WorldEntitiesDropdown } from "./worldViewer/entityItemList";
import { WorldEntitiesButton } from "./worldViewer/worldButton";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/
export const WorldDropdownButton = React.memo(() => {
  /***** RENDER *****/
  return (
    <li className={styles.worldsEntitiesEntityItem}>
      <Dropdown.Manager>
        <WorldEntitiesButton />
        <Dropdown.Content>
          <WorldEntitiesDropdown />
        </Dropdown.Content>
      </Dropdown.Manager>
    </li>
  );
});
