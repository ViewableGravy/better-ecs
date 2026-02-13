import type { EntityId, UserWorld } from "@repo/engine";
import { Vec2 } from "@repo/engine";
import { Transform2D } from "@repo/engine/components";
import type { ContextId } from "@repo/spatial-contexts";
import { ContextEntryRegion } from "../components/context-entry-region";

export type ContextRegionMatch = {
  regionEntityId: EntityId;
  contextId: ContextId;
};

export function isInsideContextRegion(
  playerTransform: Transform2D,
  region: ContextEntryRegion,
): boolean {
  const playerPosition = new Vec2(playerTransform.curr.pos.x, playerTransform.curr.pos.y);
  return region.bounds.containsPoint(playerPosition);
}

export function findContainingContextRegion(
  world: UserWorld,
  playerTransform: Transform2D,
): ContextRegionMatch | undefined {
  for (const regionEntityId of world.query(ContextEntryRegion)) {
    const region = world.get(regionEntityId, ContextEntryRegion);
    if (!region) {
      continue;
    }

    if (!isInsideContextRegion(playerTransform, region)) {
      continue;
    }

    return {
      regionEntityId,
      contextId: region.targetContextId,
    };
  }

  return undefined;
}

export function findRegionByContextId(
  world: UserWorld,
  targetContextId: ContextId,
): ContextRegionMatch | undefined {
  for (const regionEntityId of world.query(ContextEntryRegion)) {
    const region = world.get(regionEntityId, ContextEntryRegion);
    if (!region) {
      continue;
    }

    if (region.targetContextId !== targetContextId) {
      continue;
    }

    return {
      regionEntityId,
      contextId: region.targetContextId,
    };
  }

  return undefined;
}
