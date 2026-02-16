import type { MousePoint } from "@repo/engine";
import { useEngine } from "@repo/engine";
import type { ContextId, ContextRelationship, SpatialContextManager } from "@repo/spatial-contexts";
import { ensureManager, resolveDeepestContextAtPoint } from "@repo/spatial-contexts";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/

type PlacementWorldResolution = {
  focusedContextId?: ContextId;
  hoveredContextId?: ContextId;
  contextId?: ContextId;
  relationship?: ContextRelationship;
  world?: ReturnType<SpatialContextManager["getWorld"]>;
  blocked: boolean;
};

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export function resolvePlacementWorld(
  engine: ReturnType<typeof useEngine>,
  worldPointer: MousePoint,
): PlacementWorldResolution {
  const manager = ensureManager(engine.scene.context);

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
