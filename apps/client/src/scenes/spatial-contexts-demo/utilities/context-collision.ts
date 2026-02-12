import type { EntityId, UserWorld } from "@repo/engine";
import { Vec2 } from "@repo/engine";
import { Transform2D } from "@repo/engine/components";
import type { ContextId } from "@repo/plugins";
import { ContextEntryRegion } from "../components/context-entry-region";

export type ContextRegionMatch = {
  regionEntityId: EntityId;
  contextId: ContextId;
};

export function isPointInsideAxisAlignedBounds(
  point: Vec2,
  center: Vec2,
  halfExtents: Vec2,
): boolean {
  const offset = point.clone().subtract(center);
  return Math.abs(offset.x) <= halfExtents.x && Math.abs(offset.y) <= halfExtents.y;
}

export function isInsideContextRegion(
  playerTransform: Transform2D,
  regionTransform: Transform2D,
  region: ContextEntryRegion,
): boolean {
  const playerPosition = new Vec2(playerTransform.curr.pos.x, playerTransform.curr.pos.y);
  const regionCenter = new Vec2(regionTransform.curr.pos.x, regionTransform.curr.pos.y);
  return isPointInsideAxisAlignedBounds(playerPosition, regionCenter, region.halfExtents);
}

export function findContainingContextRegion(
  world: UserWorld,
  playerTransform: Transform2D,
): ContextRegionMatch | undefined {
  for (const regionEntityId of world.query(ContextEntryRegion, Transform2D)) {
    const region = world.get(regionEntityId, ContextEntryRegion);
    const regionTransform = world.get(regionEntityId, Transform2D);
    if (!region || !regionTransform) {
      continue;
    }

    if (!isInsideContextRegion(playerTransform, regionTransform, region)) {
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
