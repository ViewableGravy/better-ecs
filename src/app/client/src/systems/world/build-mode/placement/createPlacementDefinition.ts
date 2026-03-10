import type { RenderVisibilityRole } from "@client/components/render-visibility";
import type { GhostPreset } from "@client/entities/ghost";
import { LandClaimQuery } from "@client/entities/land-claim";
import type {
  BuildItemType,
  BuildModeState,
} from "@client/systems/world/build-mode/const";
import type { GridCoordinates } from "@client/systems/world/build-mode/grid-singleton";
import type { EntityId, UserWorld } from "@engine";
import {
  COLLISION_LAYERS,
  inLayer,
  type PhysicsBody,
} from "@libs/physics";

import { PlacementQueries } from "@client/systems/world/build-mode/placement/queries";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/

type PlacementPayloadResolver<TPayload> = (context: PlacementContext) => TPayload | null | undefined;
type PlacementCanPlace<TPayload> = (context: PlacementContext, payload?: TPayload) => boolean;
export type PlacementSpawn<TPayload> = (context: PlacementSpawnContext, payload?: TPayload) => void;

export type PlacementOccupancyQuery = "grid" | "overlap";
export type PlacementOccupancyMode = "block" | "replace";

type PlacementReplacePredicate<TPayload> = (
  occupant: PhysicsBody,
  context: PlacementContext,
  payload?: TPayload,
) => boolean;

type PlacementOccupancyResolver<TPayload> = (
  occupants: PhysicsBody[],
  context: PlacementContext,
  payload?: TPayload,
) => boolean;

export type PlacementStrategy<TPayload> = {
  requiresBuildableArea?: boolean;
  query?: PlacementOccupancyQuery;
  layers?: bigint;
  strategy?: PlacementOccupancyMode | PlacementOccupancyResolver<TPayload>;
  replaceableLayers?: bigint;
  canReplace?: PlacementReplacePredicate<TPayload>;
};

type CreatePlacementDefinitionOptions<TPayload, TGhostEntityId extends EntityId> = {
  item: BuildItemType;
  ghost: GhostPreset<TPayload, TGhostEntityId>;
  resolvePayload?: PlacementPayloadResolver<TPayload>;
  placementStrategy?: PlacementStrategy<TPayload>;
  canPlace?: PlacementCanPlace<TPayload>;
  spawn: PlacementSpawn<TPayload>;
};

export type PlacementContext = {
  world: UserWorld;
  gridCoordinates: GridCoordinates;
  snappedX: number;
  snappedY: number;
  buildModeState: BuildModeState;
};

export type PlacementSpawnContext = PlacementContext & {
  renderVisibilityRole: RenderVisibilityRole;
};

export type PlacementDefinition<TPayload = void, TGhostEntityId extends EntityId = EntityId> = {
  item: BuildItemType;
  ghost: GhostPreset<TPayload, TGhostEntityId>;
  resolvePayload?: PlacementPayloadResolver<TPayload>;
  placementStrategy?: PlacementStrategy<TPayload>;
  canPlace: PlacementCanPlace<TPayload>;
  spawn: PlacementSpawn<TPayload>;
};

type ResolvedPlacementStrategy<TPayload> = {
  requiresBuildableArea: boolean;
  query: PlacementOccupancyQuery;
  layers: bigint;
  strategy: PlacementOccupancyMode | PlacementOccupancyResolver<TPayload>;
  replaceableLayers?: bigint;
  canReplace?: PlacementReplacePredicate<TPayload>;
};

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export function createPlacementDefinition<TPayload = void, TGhostEntityId extends EntityId = EntityId>(
  definition: CreatePlacementDefinitionOptions<TPayload, TGhostEntityId>,
): PlacementDefinition<TPayload, TGhostEntityId> {
  const placementStrategy = resolvePlacementStrategy(definition);
  const canPlace: PlacementCanPlace<TPayload> = definition.canPlace
    ?? ((context, payload) => canPlaceFromStrategy(placementStrategy, context, payload));

  return {
    ...definition,
    placementStrategy,
    canPlace,
  };
}

function resolvePlacementStrategy<TPayload, TGhostEntityId extends EntityId>(
  definition: CreatePlacementDefinitionOptions<TPayload, TGhostEntityId>,
): ResolvedPlacementStrategy<TPayload> {
  return {
    requiresBuildableArea: definition.placementStrategy?.requiresBuildableArea ?? definition.item !== "land-claim",
    query: definition.placementStrategy?.query ?? "overlap",
    layers: definition.placementStrategy?.layers ?? (COLLISION_LAYERS.SOLID | COLLISION_LAYERS.CONVEYOR),
    strategy: definition.placementStrategy?.strategy ?? "block",
    replaceableLayers: definition.placementStrategy?.replaceableLayers,
    canReplace: definition.placementStrategy?.canReplace,
  };
}

function canPlaceFromStrategy<TPayload>(
  strategy: ResolvedPlacementStrategy<TPayload>,
  context: PlacementContext,
  payload?: TPayload,
): boolean {
  if (strategy.requiresBuildableArea && !LandClaimQuery.isWithinBuildableArea(context.world, context.gridCoordinates)) {
    return false;
  }

  const occupants = queryPlacementOccupants(strategy, context);

  if (typeof strategy.strategy === "function") {
    return strategy.strategy(occupants, context, payload);
  }

  if (strategy.strategy === "replace") {
    if (occupants.length === 0) {
      return true;
    }

    if (!strategy.canReplace) {
      const replaceableLayers = strategy.replaceableLayers;

      if (replaceableLayers === undefined || replaceableLayers === 0n) {
        return false;
      }

      return occupants.every((occupant) => inLayer(occupant.participation.layers, replaceableLayers));
    }

    return occupants.every((occupant) => strategy.canReplace?.(occupant, context, payload) === true);
  }

  return occupants.length === 0;
}

function queryPlacementOccupants<TPayload>(
  strategy: ResolvedPlacementStrategy<TPayload>,
  context: PlacementContext,
): PhysicsBody[] {
  if (strategy.query === "grid") {
    return PlacementQueries.queryPlacementOccupantsByGrid(context.world, context.gridCoordinates, strategy.layers);
  }

  const overlap = PlacementQueries.queryFirstPlacementOverlap(context.world, context.gridCoordinates, strategy.layers);

  if (overlap === undefined) {
    return [];
  }

  return [overlap];
}
