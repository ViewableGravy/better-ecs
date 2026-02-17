import React, { Activity, useState } from "react";
import styles from "./styles.module.css";
import { WorldEntitiesDropdown } from "./worldViewer/entityItemList";
import { WorldEntitiesButton } from "./worldViewer/worldButton";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/
export const WorldDropdownButton = React.memo(() => {
  /***** STATE *****/
  const [isExpanded, setIsExpanded] = useState(false);

  /***** RENDER *****/
  return (
    <section className={styles.worldsEntitiesWorldSection}>
      <WorldEntitiesButton isExpanded={isExpanded} onToggle={() => setIsExpanded(!isExpanded)} />
      <Activity mode={isExpanded ? "visible" : "hidden"} >
        <WorldEntitiesDropdown />
      </Activity>
    </section>
  );
});
