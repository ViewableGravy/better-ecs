import { Debug } from "@ui/layout/components";
import { EngineUiContext } from "@ui/layout/sidebar/utilities/engine-context";
import { useInvariantContext } from "@ui/layout/sidebar/utilities/hooks/use-invariant-context";
import styles from "@ui/layout/sidebar/panels/hierarchy/styles.module.css";
import { EntityIdContext, WorldIdContext } from "@ui/layout/sidebar/panels/hierarchy/worldViewer/context";

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

  /***** RENDER HELPERS *****/
  const world = engine.scene.context.requireWorld(worldId);
  const debug = world.get(entityId, Debug);

  /***** RENDER *****/
  return (
    <span className={className ?? styles.worldsEntitiesEntityName}>
      {debug?.name ?? entityId}
    </span>
  );
};
