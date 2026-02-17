import { EngineUiContext } from "../utilities/engine-context";
import { useIntervalState } from "../utilities/hooks/use-interval-state";
import { useInvariantContext } from "../utilities/hooks/use-invariant-context";
import styles from "./styles.module.css";
import { WorldEntitiesItem } from "./world-entities-item";

export const WorldsEntitiesPanel: React.FC = () => {
  const engine = useInvariantContext(EngineUiContext);

  const worldIds = useIntervalState(250, () => {
    const ids: string[] = [];

    for (const [worldId] of engine.scene.context.worldEntries) {
      ids.push(worldId);
    }

    return ids.sort((left, right) => left.localeCompare(right));
  });

  return (
    <div className={styles.worldsEntitiesPanel}>
      {worldIds.map((worldId) => (
        <WorldEntitiesItem key={worldId} worldId={worldId} />
      ))}
    </div>
  );
};
