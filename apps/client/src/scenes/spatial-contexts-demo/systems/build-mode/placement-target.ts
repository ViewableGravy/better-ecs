import { ContextEntryRegion } from "@/scenes/spatial-contexts-demo/components/context-entry-region";
import type { MousePoint } from "@repo/engine";
import { useEngine, Vec2, type SceneContext } from "@repo/engine";
import type { ContextId, ContextRelationship, SpatialContextManager } from "@repo/spatial-contexts";
import { ensureManager } from "@repo/spatial-contexts";

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

function resolveDeepestContextAtPoint(
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

      if (!RegionUtils.pointInsideRegion(region, worldPointer)) {
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


class RegionUtils {
  private static pointBuffer = new Vec2();

  public static pointInsideRegion(region: ContextEntryRegion, worldPointer: MousePoint): boolean {
    RegionUtils.pointBuffer.set(worldPointer.x, worldPointer.y);
    return region.bounds.containsPoint(RegionUtils.pointBuffer);
  }
}

