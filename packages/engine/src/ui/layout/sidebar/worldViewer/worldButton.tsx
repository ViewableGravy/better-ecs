import type React from "react";
import { useInvariantContext } from "@ui/utilities/hooks/use-invariant-context";
import styles from "@ui/layout/sidebar/styles.module.css";
import { WorldIdContext } from "@ui/layout/sidebar/worldViewer/context";
import { EntityRow } from "@ui/layout/sidebar/worldViewer/entityRow";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/
type WorldEntitiesButton = React.FC;

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/
export const WorldEntitiesButton: WorldEntitiesButton = () => {
  const worldId = useInvariantContext(WorldIdContext);

  /***** RENDER *****/
  return (
    <EntityRow.DropdownButton depth={0} hasContent>
      <EntityRow.Root>
        <EntityRow.Icon.World />
        <span className={styles.worldsEntitiesEntityName}>{worldId}</span>
      </EntityRow.Root>
    </EntityRow.DropdownButton>
  );
};
