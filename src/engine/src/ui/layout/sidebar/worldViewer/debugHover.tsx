import { EditorHoverHighlight } from "@engine/components";
import { EntityIdContext, WorldIdContext } from "@engine/ui/layout/sidebar/worldViewer/context";
import { EngineUiContext } from "@engine/ui/utilities/engine-context";
import { useInvariantContext } from "@engine/ui/utilities/hooks/use-invariant-context";
import React, { useEffect } from "react";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/
type DebugHoverProps = {
  children: React.ReactNode;
};

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/
export const DebugHover: React.FC<DebugHoverProps> = ({ children }) => {
  /***** HOOKS *****/
  const engine = useInvariantContext(EngineUiContext);
  const worldId = useInvariantContext(WorldIdContext);
  const entityId = useInvariantContext(EntityIdContext);

  useEffect(() => {
    return () => {
      const world = engine.scene.context.getWorld(worldId);
      if (!world) {
        return;
      }

      if (world.has(entityId, EditorHoverHighlight)) {
        world.remove(entityId, EditorHoverHighlight);
      }
    };
  }, [engine, entityId, worldId]);

  /***** FUNCTIONS *****/
  const onMouseEnter = () => {
    const world = engine.scene.context.getWorld(worldId);
    if (!world) {
      return;
    }

    if (!world.has(entityId, EditorHoverHighlight)) {
      world.add(entityId, EditorHoverHighlight, new EditorHoverHighlight(0.35));
    }
  };

  const onMouseLeave = () => {
    const world = engine.scene.context.getWorld(worldId);
    if (!world) {
      return;
    }

    if (world.has(entityId, EditorHoverHighlight)) {
      world.remove(entityId, EditorHoverHighlight);
    }
  };

  /***** RENDER *****/
  return (
    <div onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} style={{ width: "100%" }}>
      {children}
    </div>
  );
};
