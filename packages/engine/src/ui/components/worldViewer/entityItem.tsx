import React, { useRef } from "react";
import { Debug, Parent, Shape, Transform2D } from "../../../components";
import type { EntityId } from "../../../ecs/entity";
import { EngineUiContext } from "../../utilities/engine-context";
import { useInvariantContext } from "../../utilities/hooks/use-invariant-context";
import styles from "../styles.module.css";
import { EntityIdContext, WorldIdContext } from "./context";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/
export const EntityItem = React.memo(() => {
  /***** STATE *****/
  const debugEntityId = useRef<EntityId | null>(null);

  /***** HOOKS *****/
  const engine = useInvariantContext(EngineUiContext);
  const worldId = useInvariantContext(WorldIdContext);
  const entityId = useInvariantContext(EntityIdContext);
  const world = engine.scene.context.requireWorld(worldId);
  const debug = world.get(entityId, Debug);

  /***** FUNCTIONS *****/
  const onMouseEnter = () => {
    debugEntityId.current = world.create();

    world.add(debugEntityId.current, Transform2D, new Transform2D(0, 0));
    world.add(debugEntityId.current, Shape, new Shape("circle", 75, 75));
    world.add(debugEntityId.current, Parent, new Parent(entityId));
  };

  const onMouseLeave = () => {
    if (debugEntityId.current) {
      world.destroy(debugEntityId.current);
      debugEntityId.current = null;
    }
  }

  /***** RENDER *****/
  return (
    <li 
      onMouseEnter={onMouseEnter} 
      onMouseLeave={onMouseLeave} 
      key={`${worldId}-${entityId.toString()}`} 
      className={styles.worldsEntitiesEntityItem}
    >
      {entityId}
      {debug && ` ${debug.name}`}
    </li>
  )
});
