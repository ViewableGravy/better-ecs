import type { MousePoint, RegisteredEngine, UserWorld } from "@repo/engine";
import type { ContextId, ContextRelationship } from "@repo/spatial-contexts";
import { resolveDeepestContextAtPoint, SpatialContexts } from "@repo/spatial-contexts";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/
export type PlacementWorldResolution = {
  focusedContextId?: ContextId;
  hoveredContextId?: ContextId;
  contextId?: ContextId;
  relationship?: ContextRelationship;
  world?: UserWorld | undefined;
  blocked: boolean;
};

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/
export function resolvePlacementWorld(
  engine: RegisteredEngine,
  worldPointer: MousePoint,
): PlacementWorldResolution {
  const manager = SpatialContexts.requireManager(engine.scene.context);

  const focusedContextId = manager.focusedContextId;
  const hoveredContextId = resolveDeepestContextAtPoint(manager, worldPointer);
  const relationship = manager.getContextRelationship(focusedContextId, hoveredContextId);
  const canPlaceInHoveredWorld = relationship === "self" || relationship === "ancestor";
  const placementWorld = canPlaceInHoveredWorld ? manager.getWorld(hoveredContextId) : undefined;

  return {
    focusedContextId,
    hoveredContextId,
    contextId: canPlaceInHoveredWorld ? hoveredContextId : undefined,
    relationship,
    world: placementWorld,
    blocked: !canPlaceInHoveredWorld || !placementWorld,
  };
}
