import { Vec2, type MousePoint } from "@repo/engine";
import type { ContextId } from "./context-id";
import type { SpatialContextManager } from "./manager";
import { ContextEntryRegion } from "./components/context-entry-region";

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
  return region.bounds.containsPoint(pointBuffer);
}
