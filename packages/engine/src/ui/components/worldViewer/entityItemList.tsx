import { EngineUiContext } from "../../utilities/engine-context";
import { useIntervalState } from "../../utilities/hooks/use-interval-state";
import { useInvariantContext } from "../../utilities/hooks/use-invariant-context";
import styles from "../styles.module.css";
import { EntityIdContext, WorldIdContext } from "./context";
import { EntityItem } from "./entityItem";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/
export const WorldEntitiesDropdown = () => {
  const engine = useInvariantContext(EngineUiContext);
  const worldId = useInvariantContext(WorldIdContext);
  
  const entityIds = useIntervalState(250, () => {
    const world = engine.scene.context.requireWorld(worldId);
    return world
      .all()
      .slice()
      .sort((left, right) => left - right);
  });

  /***** RENDER *****/
  return (
    <ul className={styles.worldsEntitiesEntityList}>
      {entityIds.map((entityId) => (
        <EntityIdContext value={entityId} key={entityId.toString()}>
          <EntityItem />
        </EntityIdContext>
      ))}
    </ul>
  );
};