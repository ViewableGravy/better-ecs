import type { MouseEvent } from "react";
import { EngineUiContext } from "../../../utilities/engine-context";
import { useInvariantContext } from "../../../utilities/hooks/use-invariant-context";
import styles from "../../styles.module.css";
import { EntityIdContext, WorldIdContext } from "../context";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/
type DeleteProps = {
  className?: string;
};

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/
export const Delete: React.FC<DeleteProps> = ({ className }) => {
  /***** HOOKS *****/
  const engine = useInvariantContext(EngineUiContext);
  const worldId = useInvariantContext(WorldIdContext);
  const entityId = useInvariantContext(EntityIdContext);

  /***** FUNCTIONS *****/
  const onDelete = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();

    const world = engine.scene.context.requireWorld(worldId);
    world.destroy(entityId);
  };

  /***** RENDER *****/
  return (
    <button
      aria-label={`Delete entity ${entityId}`}
      className={className ?? styles.worldsEntitiesDeleteEntityButton}
      onClick={onDelete}
      title="Delete entity"
      type="button"
    >
      <svg aria-hidden="true" className={styles.worldsEntitiesDeleteEntityIcon} viewBox="0 0 256 256">
        <path
          d="M216,48H176V40a24,24,0,0,0-24-24H104A24,24,0,0,0,80,40v8H40a8,8,0,0,0,0,16h8V208a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V64h8a8,8,0,0,0,0-16ZM96,40a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96Zm96,168H64V64H192ZM112,104v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Zm48,0v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Z"
          fill="currentColor"
        />
      </svg>
    </button>
  );
};
