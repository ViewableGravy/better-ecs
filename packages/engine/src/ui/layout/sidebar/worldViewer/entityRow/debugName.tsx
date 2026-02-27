import { Debug } from "@/components";
import styles from "@ui/layout/sidebar/styles.module.css";
import { EntityIdContext, WorldIdContext } from "@ui/layout/sidebar/worldViewer/context";
import { EngineUiContext } from "@ui/utilities/engine-context";
import { useInvariantContext } from "@ui/utilities/hooks/use-invariant-context";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/
type DebugNameProps = {
  className?: string;
};

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/
export const DebugName: React.FC<DebugNameProps> = ({ className }) => {
  /***** HOOKS *****/
  const engine = useInvariantContext(EngineUiContext);
  const worldId = useInvariantContext(WorldIdContext);
  const entityId = useInvariantContext(EntityIdContext);

  const world = engine.scene.context.requireWorld(worldId);
  const entityName = world.get(entityId, Debug)?.name;

  /***** RENDER *****/
  return (
    <span className={className ?? styles.worldsEntitiesEntityName}>
      {entityName ?? entityId}
    </span>
  );
};
