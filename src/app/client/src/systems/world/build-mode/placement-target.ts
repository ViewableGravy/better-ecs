import type { MousePoint, RegisteredEngine, UserWorld } from "@engine";
import type { ContextId, ContextRelationship } from "@libs/spatial-contexts";
import { resolveDeepestContextAtPoint, SpatialContexts } from "@libs/spatial-contexts";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/
export type PlacementTargetResolution = {
  inputWorld: UserWorld;
  focusedWorld: UserWorld;
  previewWorld: UserWorld;
  previewContextId?: ContextId;
  focusedContextId?: ContextId;
  hoveredContextId?: ContextId;
  commitContextId?: ContextId;
  relationship?: ContextRelationship;
  commitWorld?: UserWorld;
  blocked: boolean;
};

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/
export function resolvePlacementWorld(
  engine: RegisteredEngine,
  worldPointer: MousePoint,
): PlacementTargetResolution {
  const manager = SpatialContexts.requireManager(engine.scene.context);

  const focusedContextId = manager.focusedContextId;
  const focusedWorld = manager.focusedWorld;
  const hoveredContextId = resolveDeepestContextAtPoint(manager, worldPointer);
  const relationship = manager.getContextRelationship(focusedContextId, hoveredContextId);
  const canPlaceInHoveredWorld = relationship === "self" || relationship === "ancestor";
  const commitWorld = canPlaceInHoveredWorld ? manager.getWorld(hoveredContextId) : undefined;

  return {
    inputWorld: focusedWorld,
    focusedWorld,
    previewWorld: focusedWorld,
    previewContextId: focusedContextId,
    focusedContextId,
    hoveredContextId,
    commitContextId: canPlaceInHoveredWorld ? hoveredContextId : undefined,
    relationship,
    commitWorld,
    blocked: !canPlaceInHoveredWorld || !commitWorld,
  };
}
