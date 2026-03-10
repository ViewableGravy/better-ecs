import type { RenderVisibilityRole } from "@client/components/render-visibility";
import type { GhostPreset } from "@client/entities/ghost";
import { LandClaimQuery } from "@client/entities/land-claim";
import type {
  BuildModeState,
} from "@client/systems/world/build-mode/const";
import type { GridCoordinates } from "@client/systems/world/build-mode/grid-singleton";
import type { UserWorld } from "@engine";
import {
  COLLISION_LAYERS,
  inLayer,
  type PhysicsBody,
} from "@libs/physics";

import {
  PlacementFootprintUtils,
  type PlacementFootprint,
} from "@client/systems/world/build-mode/placement/footprint";
import { PlacementQueries } from "@client/systems/world/build-mode/placement/queries";
import type { ContextId, ContextRelationship } from "@libs/spatial-contexts";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/

export type PlacementPayloadResolver<TPayload> = (context: PlacementContext) => TPayload | null | undefined;
export type PlacementCanPlace<TPayload> = (context: PlacementContext, payload?: TPayload) => boolean;
export type PlacementSpawn<TPayload> = (context: PlacementSpawnContext, payload?: TPayload) => void;
export type PlacementDragMode = "single" | "line";
export type PlacementRotationMode = "none" | "placement-end-side";

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

export type PlacementDefinitionSharedOptions<TPayload> = {
  item: string;
  ghost: GhostPreset<TPayload>;
  dragPlacementMode?: PlacementDragMode;
  rotationMode?: PlacementRotationMode;
  resolvePayload?: PlacementPayloadResolver<TPayload>;
  footprint?: PlacementFootprint;
  placementStrategy?: PlacementStrategy<TPayload>;
};

type CreatePlacementDefinitionOptions<TPayload> = PlacementDefinitionSharedOptions<TPayload> & {
  canPlace?: PlacementCanPlace<TPayload>;
  spawn: PlacementSpawn<TPayload>;
};

export type PlacementContext = {
  world: UserWorld;
  inputWorld: UserWorld;
  focusedWorld: UserWorld;
  previewWorld: UserWorld;
  commitWorld: UserWorld;
  previewContextId?: ContextId;
  commitContextId?: ContextId;
  relationship?: ContextRelationship;
  gridCoordinates: GridCoordinates;
  snappedX: number;
  snappedY: number;
  buildModeState: BuildModeState;
};

export type PlacementSpawnContext = PlacementContext & {
  renderVisibilityRole: RenderVisibilityRole;
};

export type PlacementDefinition<TPayload = void> = {
  item: string;
  ghost: GhostPreset<TPayload>;
  dragPlacementMode: PlacementDragMode;
  rotationMode: PlacementRotationMode;
  resolvePayload?: PlacementPayloadResolver<TPayload>;
  footprint?: PlacementFootprint;
  placementStrategy?: PlacementStrategy<TPayload>;
  canPlace: PlacementCanPlace<TPayload>;
  spawn: PlacementSpawn<TPayload>;
};

type ResolvedPlacementStrategy<TPayload> = {
  footprint: PlacementFootprint;
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

export function createPlacementDefinition<TPayload = void>(
  definition: CreatePlacementDefinitionOptions<TPayload>,
): PlacementDefinition<TPayload> {
  const placementStrategy = resolvePlacementStrategy(definition);
  const canPlace = createPlacementCanPlace(definition, placementStrategy);

  return {
    ...definition,
    dragPlacementMode: definition.dragPlacementMode ?? "single",
    placementStrategy,
    rotationMode: definition.rotationMode ?? "none",
    canPlace,
  };
}

export function createPlacementCanPlace<TPayload>(
  definition: Pick<CreatePlacementDefinitionOptions<TPayload>, "item" | "footprint" | "placementStrategy" | "canPlace">,
  resolvedStrategy: ResolvedPlacementStrategy<TPayload> = resolvePlacementStrategy({
    item: definition.item,
    footprint: definition.footprint,
    placementStrategy: definition.placementStrategy,
  }),
): PlacementCanPlace<TPayload> {
  if (definition.canPlace) {
    return definition.canPlace;
  }

  return (context, payload) => canPlaceFromStrategy(resolvedStrategy, context, payload);
}

function resolvePlacementStrategy<TPayload>(
  definition: Pick<
    PlacementDefinitionSharedOptions<TPayload>,
    "item" | "footprint" | "placementStrategy"
  >,
): ResolvedPlacementStrategy<TPayload> {
  return {
    footprint: definition.footprint ?? PlacementFootprintUtils.unit,
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
  if (strategy.requiresBuildableArea && !canBuildAcrossFootprint(strategy, context)) {
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
  const footprintCoordinates = PlacementFootprintUtils.resolveFootprintCoordinates(
    context.gridCoordinates,
    strategy.footprint,
  );
  const occupantsByEntityId = new Map<number, PhysicsBody>();

  for (const gridCoordinates of footprintCoordinates) {
    const occupants = queryPlacementOccupantsAtCoordinates(strategy, context.world, gridCoordinates);

    for (const occupant of occupants) {
      occupantsByEntityId.set(occupant.entityId, occupant);
    }
  }

  return [...occupantsByEntityId.values()];
}

function queryPlacementOccupantsAtCoordinates<TPayload>(
  strategy: ResolvedPlacementStrategy<TPayload>,
  world: UserWorld,
  gridCoordinates: GridCoordinates,
): PhysicsBody[] {
  if (strategy.query === "grid") {
    return PlacementQueries.queryPlacementOccupantsByGrid(world, gridCoordinates, strategy.layers);
  }

  const overlap = PlacementQueries.queryFirstPlacementOverlap(world, gridCoordinates, strategy.layers);

  if (overlap === undefined) {
    return [];
  }

  return [overlap];
}

function canBuildAcrossFootprint<TPayload>(
  strategy: ResolvedPlacementStrategy<TPayload>,
  context: PlacementContext,
): boolean {
  const footprintCoordinates = PlacementFootprintUtils.resolveFootprintCoordinates(
    context.gridCoordinates,
    strategy.footprint,
  );

  return footprintCoordinates.every((gridCoordinates) => LandClaimQuery.isWithinBuildableArea(context.world, gridCoordinates));
}
