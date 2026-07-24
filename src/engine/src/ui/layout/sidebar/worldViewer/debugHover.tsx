import { EditorHoverHighlight } from "@engine/components";
import { EntityIdContext } from "@engine/ui/layout/sidebar/worldViewer/context";
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
  const entityId = useInvariantContext(EntityIdContext);

  useEffect(() => {
    return () => {
      const registry = engine.scene.registry;

      if (registry.has(entityId, EditorHoverHighlight)) {
        registry.remove(entityId, EditorHoverHighlight);
      }
    };
  }, [engine, entityId]);

  /***** FUNCTIONS *****/
  const onMouseEnter = () => {
    const registry = engine.scene.registry;

    if (!registry.has(entityId, EditorHoverHighlight)) {
      registry.add(entityId, EditorHoverHighlight, new EditorHoverHighlight(0.35));
    }
  };

  const onMouseLeave = () => {
    const registry = engine.scene.registry;

    if (registry.has(entityId, EditorHoverHighlight)) {
      registry.remove(entityId, EditorHoverHighlight);
    }
  };

  /***** RENDER *****/
  return (
    <div onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} style={{ width: "100%" }}>
      {children}
    </div>
  );
};
