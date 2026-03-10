import { Placeable } from "@client/systems/world/build-mode/components";
import type { BuildItemType } from "@client/systems/world/build-mode/const";
import type { EntityId } from "@engine";

import type {
  PlacementSpawn,
  PlacementSpawnContext,
} from "@client/systems/world/build-mode/placement/createPlacementDefinition";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/

type PlacementSpawnResult = EntityId | EntityId[] | void;

type CreatePlacementSpawnerOptions<TPayload, TResult extends PlacementSpawnResult = PlacementSpawnResult> = {
  item: BuildItemType;
  replace?: (context: PlacementSpawnContext, payload?: TPayload) => void;
  spawn: (context: PlacementSpawnContext, payload?: TPayload) => TResult;
  afterSpawn?: (context: PlacementSpawnContext, result: TResult, payload?: TPayload) => void;
  markPlaceable?: boolean;
};

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export function createPlacementSpawner<TPayload, TResult extends PlacementSpawnResult = PlacementSpawnResult>(
  options: CreatePlacementSpawnerOptions<TPayload, TResult>,
): PlacementSpawn<TPayload> {
  return (context, payload) => {
    options.replace?.(context, payload);

    const result = options.spawn(context, payload);

    if (options.markPlaceable) {
      markPlaceableEntities(context, options.item, result);
    }

    options.afterSpawn?.(context, result, payload);
  };
}

function markPlaceableEntities(
  context: PlacementSpawnContext,
  item: BuildItemType,
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