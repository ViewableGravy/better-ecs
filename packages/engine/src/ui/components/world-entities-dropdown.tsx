import type { EntityId } from "../../ecs/entity";
import { EngineUiContext } from "../utilities/engine-context";
import { useIntervalState } from "../utilities/hooks/use-interval-state";
import { useInvariantContext } from "../utilities/hooks/use-invariant-context";
import styles from "./styles.module.css";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/
type WorldEntitiesDropdownProps = {
  worldId: string;
};

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/
export const WorldEntitiesDropdown: React.FC<WorldEntitiesDropdownProps> = ({ worldId }) => {
  const engine = useInvariantContext(EngineUiContext);

  const entityIds = useIntervalState(250, () => {
    const world = engine.scene.context.getWorld(worldId);

    if (!world) {
      const emptyEntityIds: EntityId[] = [];
      return emptyEntityIds;
    }

    return world.all().slice().sort((left, right) => left - right);
  });

  /***** RENDER *****/
  return (
    <ul className={styles.worldsEntitiesEntityList}>
      {entityIds.map((entityId) => (
        <li key={`${worldId}-${entityId.toString()}`} className={styles.worldsEntitiesEntityItem}>
          {entityId}
        </li>
      ))}
    </ul>
  );
};
