import { ContextEntryRegion } from "@/scenes/spatial-contexts-demo/components/context-entry-region";
import type { UserWorld } from "@repo/engine";
import { Vec2, type SceneContext } from "@repo/engine";
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
  world?: UserWorld;
  blocked: boolean;
};

type BuildModeEngine = {
  scene: {
    context: SceneContext;
  };
};

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

const pointBuffer = new Vec2();

export function resolvePlacementWorld(
  engine: BuildModeEngine,
  worldX: number,
  worldY: number,
): PlacementWorldResolution {
  const manager = ensureManager(engine.scene.context);

  const focusedContextId = manager.getFocusedContextId();
  const hoveredContextId = resolveDeepestContextAtPoint(manager, worldX, worldY);
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
  worldX: number,
  worldY: number,
): ContextId {
  const rootContextId = manager.getRootContextId();
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

      if (!pointInsideRegion(region, worldX, worldY)) {
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

function pointInsideRegion(region: ContextEntryRegion, worldX: number, worldY: number): boolean {
  pointBuffer.set(worldX, worldY);
  return region.bounds.containsPoint(pointBuffer);
}
