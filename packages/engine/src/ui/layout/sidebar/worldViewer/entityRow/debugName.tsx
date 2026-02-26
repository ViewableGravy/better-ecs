import { Debug } from "@/components";
import { EngineUiContext } from "@ui/utilities/engine-context";
import { useEntitySelector } from "@ui/utilities/hooks/use-entity-selector";
import { useInvariantContext } from "@ui/utilities/hooks/use-invariant-context";
import styles from "@ui/layout/sidebar/styles.module.css";
import { EntityIdContext, WorldIdContext } from "@ui/layout/sidebar/worldViewer/context";

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
  const entityName = useEntitySelector(world, entityId, (currentWorld) => {
    return currentWorld.get(entityId, Debug)?.name;
  });

  /***** RENDER *****/
  return (
    <span className={className ?? styles.worldsEntitiesEntityName}>
      {entityName ?? entityId}
    </span>
  );
};
