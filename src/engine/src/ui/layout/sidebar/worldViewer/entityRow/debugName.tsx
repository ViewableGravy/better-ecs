import styles from "@engine/ui/layout/sidebar/styles.module.css";
import { EntityIdContext } from "@engine/ui/layout/sidebar/worldViewer/context";
import { useInvariantContext } from "@engine/ui/utilities/hooks/use-invariant-context";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/
type DebugNameProps = {
  name?: string | null;
  className?: string;
};

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/
export const DebugName: React.FC<DebugNameProps> = ({ name, className }) => {
  /***** HOOKS *****/
  const entityId = useInvariantContext(EntityIdContext);

  /***** RENDER *****/
  return (
    <span className={className ?? styles.worldsEntitiesEntityName}>
      {name ?? entityId}
    </span>
  );
};
