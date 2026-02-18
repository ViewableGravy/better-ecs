import type React from "react";
import { useInvariantContext } from "../../utilities/hooks/use-invariant-context";
import styles from "../styles.module.css";
import { WorldIdContext } from "./context";
import { EntityRow } from "./entityRow";

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
        <EntityRow.TypeIcon kind="world" />
        <span className={styles.worldsEntitiesEntityName}>{worldId}</span>
      </EntityRow.Root>
    </EntityRow.DropdownButton>
  );
};
