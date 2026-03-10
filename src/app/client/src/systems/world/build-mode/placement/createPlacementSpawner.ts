import { Placeable } from "@client/systems/world/build-mode/components";
import type { EntityId } from "@engine";

import type {
  PlacementSpawn,
  PlacementSpawnContext,
} from "@client/systems/world/build-mode/placement/createPlacementDefinition";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/

type PlacementSpawnResult = EntityId | EntityId[] | void;

type PlacementSpawnPoint = {
  placementX: number;
  placementY: number;
};

type PlacementResolvedSpawnContext = PlacementSpawnContext & PlacementSpawnPoint;

type CreatePlacementSpawnerOptions<TPayload, TResult extends PlacementSpawnResult = PlacementSpawnResult> = {
  item: string;
  resolveSpawnPoint?: (context: PlacementSpawnContext, payload?: TPayload) => PlacementSpawnPoint;
  replace?: (context: PlacementResolvedSpawnContext, payload?: TPayload) => void;
  spawn: (context: PlacementResolvedSpawnContext, payload?: TPayload) => TResult;
  afterSpawn?: (context: PlacementResolvedSpawnContext, result: TResult, payload?: TPayload) => void;
  markPlaceable?: boolean;
};

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export function createPlacementSpawner<TPayload, TResult extends PlacementSpawnResult = PlacementSpawnResult>(
  options: CreatePlacementSpawnerOptions<TPayload, TResult>,
): PlacementSpawn<TPayload> {
  return (context, payload) => {
    const resolvedContext = resolveSpawnContext(options, context, payload);

    options.replace?.(resolvedContext, payload);

    const result = options.spawn(resolvedContext, payload);

    if (options.markPlaceable) {
      markPlaceableEntities(context, options.item, result);
    }

    options.afterSpawn?.(resolvedContext, result, payload);
  };
}

function resolveSpawnContext<TPayload, TResult extends PlacementSpawnResult>(
  options: CreatePlacementSpawnerOptions<TPayload, TResult>,
  context: PlacementSpawnContext,
  payload?: TPayload,
): PlacementResolvedSpawnContext {
  const placementPoint = options.resolveSpawnPoint?.(context, payload) ?? {
    placementX: context.snappedX,
    placementY: context.snappedY,
  };

  return {
    ...context,
    ...placementPoint,
  };
}

function markPlaceableEntities(
  context: PlacementSpawnContext,
  item: string,
  result: PlacementSpawnResult,
): void {
  for (const entityId of normalizePlacementSpawnResult(result)) {
    if (context.world.has(entityId, Placeable)) {
      continue;
    }

    context.world.add(entityId, new Placeable(item));
  }
}

function normalizePlacementSpawnResult(result: PlacementSpawnResult): EntityId[] {
  if (result === undefined) {
    return [];
  }

  if (Array.isArray(result)) {
    return result;
  }

  return [result];
}