import { Rectangle, Vec2, type MousePoint } from "@engine";
import { ContextEntryRegion } from "@libs/spatial-contexts/components/context-entry-region";
import type { ContextId } from "@libs/spatial-contexts/context-id";
import type { SpatialContextManager } from "@libs/spatial-contexts/manager";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/

type SerializedVec2 = {
  x: number;
  y: number;
};

type SerializedRectangle = {
  position: SerializedVec2;
  size: SerializedVec2;
};

/**
 * Resolves the deepest (most nested) spatial context at a given point in world space.
 * 
 * This function walks the context hierarchy starting from the root context, checking
 * each context's entry regions to find which nested contexts contain the point.
 * It returns the deepest context found.
 * 
 * If a world has no ContextEntryRegion components, it is treated as taking up the entire viewport.
 * 
 * @param manager - The spatial context manager
 * @param worldPointer - The point in world space to check
 * @returns The ContextId of the deepest context containing the point
 */
export function resolveDeepestContextAtPoint(
  manager: SpatialContextManager,
  worldPointer: MousePoint,
): ContextId {
  const rootContextId = manager.rootContextId;

  let deepestContextId = rootContextId;
  let deepestDepth = 0;

  const walk = (parentContextId: ContextId, depth: number): void => {
    const parentWorld = manager.getWorld(parentContextId);
    if (!parentWorld) {
      return;
    }

    for (const regionEntityId of parentWorld.query(ContextEntryRegion)) {
      const region = parentWorld.get(regionEntityId, ContextEntryRegion);
      if (!region) {
        continue;
      }

      if (!pointInsideRegion(region, worldPointer)) {
        continue;
      }

      if (manager.getParentContextId(region.targetContextId) !== parentContextId) {
        continue;
      }

      const childDepth = depth + 1;
      if (childDepth > deepestDepth) {
        deepestDepth = childDepth;
        deepestContextId = region.targetContextId;
      }

      walk(region.targetContextId, childDepth);
    }
  };

  walk(rootContextId, 0);

  return deepestContextId;
}

/**
 * Utility buffer for point-in-region checks to avoid allocations
 */
const pointBuffer = new Vec2();

/**
 * Checks if a world point is inside a context entry region
 * 
 * @param region - The context entry region to check
 * @param worldPointer - The point in world space
 * @returns True if the point is inside the region bounds
 */
function pointInsideRegion(region: ContextEntryRegion, worldPointer: MousePoint): boolean {
  pointBuffer.set(worldPointer.x, worldPointer.y);

  return contextEntryRegionContainsPoint(region, pointBuffer);
}

export function contextEntryRegionContainsPoint(region: ContextEntryRegion, point: Vec2): boolean {
  const bounds = resolveContextEntryRegionBounds(region);

  return bounds.containsPoint(point);
}

function resolveContextEntryRegionBounds(region: ContextEntryRegion): Rectangle {
  if (region.bounds instanceof Rectangle) {
    return region.bounds;
  }

  const serializedBounds = region.bounds as SerializedRectangle;

  return new Rectangle(
    new Vec2(serializedBounds.position.x, serializedBounds.position.y),
    new Vec2(serializedBounds.size.x, serializedBounds.size.y),
  );
}
