import type React from "react";
import { useInvariantContext } from "../../utilities/hooks/use-invariant-context";
import styles from "../styles.module.css";
import { WorldIdContext } from "./context";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/
type WorldEntitiesButton = React.FC<{
  isExpanded: boolean;
  onToggle: () => void;
}>;

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/
export const WorldEntitiesButton: WorldEntitiesButton = ({ isExpanded, onToggle }) => {
  const worldId = useInvariantContext(WorldIdContext);

  /***** RENDER *****/
  return (
    <button
      aria-expanded={isExpanded}
      className={styles.worldsEntitiesWorldButton}
      onClick={onToggle}
      type="button"
    >
      <span className={styles.worldsEntitiesWorldLabel}>{worldId}</span>
      <span
        aria-hidden="true"
        className={[
          styles.worldsEntitiesWorldChevron,
          isExpanded ? styles.worldsEntitiesWorldChevronExpanded : "",
        ].join(" ")}
      >
        ▾
      </span>
    </button>
  );
};
