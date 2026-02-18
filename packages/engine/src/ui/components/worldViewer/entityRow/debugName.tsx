import { Debug } from "../../../../components";
import { EngineUiContext } from "../../../utilities/engine-context";
import { useInvariantContext } from "../../../utilities/hooks/use-invariant-context";
import styles from "../../styles.module.css";
import { EntityIdContext, WorldIdContext } from "../context";

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
