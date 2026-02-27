import { Gizmo, Transform2D } from "@/components";
import styles from "@ui/layout/sidebar/styles.module.css";
import { EntityIdContext, WorldIdContext } from "@ui/layout/sidebar/worldViewer/context";
import { EngineUiContext } from "@ui/utilities/engine-context";
import { useInvariantContext } from "@ui/utilities/hooks/use-invariant-context";
import type { MouseEvent } from "react";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/
type CenterCameraProps = {
  className?: string;
};

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/
export const CenterCamera: React.FC<CenterCameraProps> = ({ className }) => {
  /***** HOOKS *****/
  const engine = useInvariantContext(EngineUiContext);
  const worldId = useInvariantContext(WorldIdContext);
  const entityId = useInvariantContext(EntityIdContext);

  /***** FUNCTIONS *****/
  const onCenterCamera = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();

    engine.editor.runningState.pause();

    const world = engine.scene.context.requireWorld(worldId);
    const transform = world.get(entityId, Transform2D);
    if (!transform) {
      return;
    }

    for (const [, worldEntry] of engine.scene.context.worldEntries) {
      for (const gizmoEntityId of worldEntry.query(Gizmo)) {
        worldEntry.remove(gizmoEntityId, Gizmo);
      }
    }

    world.add(entityId, Gizmo, new Gizmo());

    engine.editor.camera.setPosition(transform.curr.pos.x, transform.curr.pos.y);
  };

  /***** RENDER *****/
  return (
    <button
      aria-label={`Center camera on entity ${entityId}`}
      className={className ?? styles.worldsEntitiesEntityActionButton}
      onClick={onCenterCamera}
      title="Center camera"
      type="button"
    >
      <svg aria-hidden="true" className={styles.worldsEntitiesEntityActionIcon} viewBox="0 0 256 256">
        <path
          d="M128,72a56,56,0,1,0,56,56A56.06,56.06,0,0,0,128,72Zm0,96a40,40,0,1,1,40-40A40,40,0,0,1,128,168Zm104-48a8,8,0,0,1-8,8H200v24a8,8,0,0,1-16,0V128H160a8,8,0,0,1,0-16h24V88a8,8,0,0,1,16,0v24h24A8,8,0,0,1,232,120ZM72,120a8,8,0,0,1-8,8H40v24a8,8,0,0,1-16,0V128H0a8,8,0,0,1,0-16H24V88a8,8,0,0,1,16,0v24H64A8,8,0,0,1,72,120Zm56,64a8,8,0,0,1,8,8v24h24a8,8,0,0,1,0,16H136v24a8,8,0,0,1-16,0V232H96a8,8,0,0,1,0-16h24V192A8,8,0,0,1,128,184Zm0-184a8,8,0,0,1,8,8V32h24a8,8,0,0,1,0,16H136V72a8,8,0,0,1-16,0V48H96a8,8,0,0,1,0-16h24V8A8,8,0,0,1,128,0Z"
          fill="currentColor"
        />
      </svg>
    </button>
  );
};
