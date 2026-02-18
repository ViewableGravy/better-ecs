import React, { useRef } from "react";
import { Parent, Shape, Transform2D } from "../../../components";
import type { EntityId } from "../../../ecs/entity";
import { EngineUiContext } from "../../utilities/engine-context";
import { useInvariantContext } from "../../utilities/hooks/use-invariant-context";
import { EntityIdContext, WorldIdContext } from "./context";
import { EditorDebugEntity } from "./editorDebugEntity";

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
  const debugEntityId = useRef<EntityId | null>(null);
  const engine = useInvariantContext(EngineUiContext);
  const worldId = useInvariantContext(WorldIdContext);
  const entityId = useInvariantContext(EntityIdContext);

  /***** FUNCTIONS *****/
  const onMouseEnter = () => {
    const world = engine.scene.context.requireWorld(worldId);
    debugEntityId.current = world.create();

    world.add(debugEntityId.current, Transform2D, new Transform2D(0, 0));
    world.add(debugEntityId.current, Shape, new Shape("circle", 75, 75));
    world.add(debugEntityId.current, Parent, new Parent(entityId));
    world.add(debugEntityId.current, EditorDebugEntity, new EditorDebugEntity());
  };

  const onMouseLeave = () => {
    if (debugEntityId.current) {
      const world = engine.scene.context.requireWorld(worldId);
      world.destroy(debugEntityId.current);
      debugEntityId.current = null;
    }
  };

  /***** RENDER *****/
  return (
    <div onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} style={{ width: "100%" }}>
      {children}
    </div>
  );
};
