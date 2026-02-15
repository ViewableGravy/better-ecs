import { ContextEntryRegion } from "@/scenes/spatial-contexts-demo/components/context-entry-region";
import { Vec2, type SceneContext, type UserWorld } from "@repo/engine";
import type { ContextId } from "@repo/spatial-contexts";
import { getManager } from "@repo/spatial-contexts";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/

type PlacementWorldResolution = {
  contextId?: ContextId;
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
const placementWorldResolutionBuffer: PlacementWorldResolution = {
  contextId: undefined,
  world: undefined,
  blocked: false,
};

export function resolvePlacementWorld(
  engine: BuildModeEngine,
  activeWorld: UserWorld,
  worldX: number,
  worldY: number,
): PlacementWorldResolution {
  const result = placementWorldResolutionBuffer;
  const manager = getManager(engine.scene.context);
  if (!manager) {
    result.contextId = undefined;
    result.world = activeWorld;
    result.blocked = false;
    return result;
  }

  const focusedContextId = manager.getFocusedContextId();
  const rootContextId = manager.getRootContextId();

  if (focusedContextId === rootContextId) {
    const rootWorld = manager.getWorld(rootContextId) ?? activeWorld;
    const blocked = containsAnyContextRegion(rootWorld, worldX, worldY);

    result.contextId = rootContextId;
    result.world = rootWorld;
    result.blocked = blocked;
    return result;
  }

  const focusedWorld = manager.getWorld(focusedContextId) ?? activeWorld;
  const focusedDefinition = manager.listDefinitions().find((definition) => definition.id === focusedContextId);

  if (!focusedDefinition?.parentId) {
    result.contextId = focusedContextId;
    result.world = focusedWorld;
    result.blocked = false;
    return result;
  }

  const parentWorld = manager.getWorld(focusedDefinition.parentId);
  if (!parentWorld) {
    result.contextId = focusedContextId;
    result.world = focusedWorld;
    result.blocked = false;
    return result;
  }

  const sourceRegion = findRegionForContext(parentWorld, focusedContextId);
  if (!sourceRegion) {
    result.contextId = focusedContextId;
    result.world = focusedWorld;
    result.blocked = false;
    return result;
  }

  const insideFocusedRegion = pointInsideRegion(sourceRegion, worldX, worldY);

  result.contextId = insideFocusedRegion ? focusedContextId : focusedDefinition.parentId;
  result.world = insideFocusedRegion ? focusedWorld : parentWorld;
  result.blocked = false;
  return result;
}

function containsAnyContextRegion(world: UserWorld, worldX: number, worldY: number): boolean {
  for (const regionEntityId of world.query(ContextEntryRegion)) {
    const region = world.get(regionEntityId, ContextEntryRegion);
    if (!region) {
      continue;
    }

    if (pointInsideRegion(region, worldX, worldY)) {
      return true;
    }
  }

  return false;
}

function findRegionForContext(world: UserWorld, contextId: ContextId): ContextEntryRegion | undefined {
  for (const regionEntityId of world.query(ContextEntryRegion)) {
    const region = world.get(regionEntityId, ContextEntryRegion);
    if (!region) {
      continue;
    }

    if (region.targetContextId !== contextId) {
      continue;
    }

    return region;
  }

  return undefined;
}

function pointInsideRegion(region: ContextEntryRegion, worldX: number, worldY: number): boolean {
  pointBuffer.set(worldX, worldY);
  return region.bounds.containsPoint(pointBuffer);
}
