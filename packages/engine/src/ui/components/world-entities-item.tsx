import React from "react";
import { EngineUiContext } from "../utilities/engine-context";
import { useInvariantContext } from "../utilities/hooks/use-invariant-context";
import styles from "./styles.module.css";
import { WorldIdContext } from "./worldViewer/context";
import { Dropdown } from "./worldViewer/dropdown";
import { WorldEntitiesDropdown } from "./worldViewer/entityItemList";
import { WorldEntitiesButton } from "./worldViewer/worldButton";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/
export const WorldDropdownButton = React.memo(() => {
  const worldId = useInvariantContext(WorldIdContext);
  const engine = useInvariantContext(EngineUiContext);

  /***** RENDER *****/
  return (
    <li className={styles.worldsEntitiesEntityItem}>
      <Dropdown.Manager defaultExpanded={worldId === engine.scene.activeWorldId}>
        <WorldEntitiesButton />
        <Dropdown.Content>
          <WorldEntitiesDropdown />
        </Dropdown.Content>
      </Dropdown.Manager>
    </li>
  );
});
