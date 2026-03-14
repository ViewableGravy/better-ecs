import { LandClaimQuery } from "@client/entities/land-claim";
import { Placeable } from "@client/systems/world/build-mode/components/placeable";
import type { GridCoordinate, GridCoordinates } from "@client/systems/world/build-mode/grid-singleton";
import {
    PlacementFootprintUtils,
    type PlacementFootprint,
} from "@client/systems/world/build-mode/placement/footprint";
import { PlacementQueries } from "@client/systems/world/build-mode/placement/queries";
import type {
    PlacementCanPlace,
    PlacementContext,
} from "@client/systems/world/build-mode/placement/types";
import type { UserWorld } from "@engine";
import {
    COLLISION_LAYERS,
    inLayer,
    type PhysicsBody,
} from "@libs/physics";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/

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

type PlacementOccupantCompatibilityGroupResolver = (
  world: UserWorld,
  occupant: PhysicsBody,
) => string | null;

export type PlacementStrategy<TPayload> = {
  requiresBuildableArea?: boolean;
  query?: PlacementOccupancyQuery;
  queries?: PlacementOccupancyQuery[];
  layers?: bigint;
  strategy?: PlacementOccupancyMode | PlacementOccupancyResolver<TPayload>;
  compatibilityGroup?: string;
  resolveOccupantCompatibilityGroup?: PlacementOccupantCompatibilityGroupResolver;
  replaceableLayers?: bigint;
  canReplace?: PlacementReplacePredicate<TPayload>;
};

export type PlacementEvaluationCell = {
  gridCoordinates: GridCoordinates;
  isBuildable: boolean;
  occupants: PhysicsBody[];
};

export type PlacementEvaluation<TPayload = void> = {
  footprint: PlacementFootprint;
  cells: PlacementEvaluationCell[];
  occupants: PhysicsBody[];
  replacementTargets: PhysicsBody[];
  buildabilityPassed: boolean;
  occupancyPassed: boolean;
  canPlace: boolean;
  payload?: TPayload;
};

export type PlacementEvaluator<TPayload> = (
  context: PlacementContext,
  payload?: TPayload,
) => PlacementEvaluation<TPayload>;

type PlacementRuleDefinition<TPayload> = {
  item: string;
  footprint?: PlacementFootprint;
  placementStrategy?: PlacementStrategy<TPayload>;
  canPlace?: PlacementCanPlace<TPayload>;
};

type ResolvedPlacementStrategy<TPayload> = {
  footprint: PlacementFootprint;
  requiresBuildableArea: boolean;
  queries: readonly PlacementOccupancyQuery[];
  layers: bigint;
  strategy: PlacementOccupancyMode | PlacementOccupancyResolver<TPayload>;
  compatibilityGroup?: string;
  resolveOccupantCompatibilityGroup?: PlacementOccupantCompatibilityGroupResolver;
  replaceableLayers?: bigint;
  canReplace?: PlacementReplacePredicate<TPayload>;
};

/**********************************************************************************************************
 *   CONSTS
 **********************************************************************************************************/

const DEFAULT_PLACEMENT_QUERIES: readonly PlacementOccupancyQuery[] = ["grid", "overlap"];

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export function createPlacementEvaluator<TPayload>(
  definition: PlacementRuleDefinition<TPayload>,
): PlacementEvaluator<TPayload> {
  const resolvedStrategy = resolvePlacementStrategy(definition);

  return (context, payload) => evaluatePlacement(resolvedStrategy, context, payload, definition.canPlace);
}

export function createPlacementCanPlace<TPayload>(
  definition: PlacementRuleDefinition<TPayload>,
  evaluator: PlacementEvaluator<TPayload> = createPlacementEvaluator(definition),
): PlacementCanPlace<TPayload> {
  return (context, payload) => evaluator(context, payload).canPlace;
}

function evaluatePlacement<TPayload>(
  strategy: ResolvedPlacementStrategy<TPayload>,
  context: PlacementContext,
  payload: TPayload | undefined,
  customCanPlace?: PlacementCanPlace<TPayload>,
): PlacementEvaluation<TPayload> {
  const cells: PlacementEvaluationCell[] = [];
  const occupants: PhysicsBody[] = [];
  const occupantEntityIds = new Set<number>();

  let buildabilityPassed = true;

  forEachFootprintCoordinate(context.gridCoordinates, strategy.footprint, (gridCoordinates) => {
    const isBuildable = !strategy.requiresBuildableArea
      || LandClaimQuery.isWithinBuildableArea(context.world, gridCoordinates);
    const cellOccupants = queryPlacementOccupantsAtCoordinates(strategy, context.world, gridCoordinates);

    cells.push({
      gridCoordinates,
      isBuildable,
      occupants: cellOccupants,
    });

    if (!isBuildable) {
      buildabilityPassed = false;
    }

    for (const occupant of cellOccupants) {
      if (occupantEntityIds.has(occupant.entityId)) {
        continue;
      }

      occupantEntityIds.add(occupant.entityId);
      occupants.push(occupant);
    }
  });

  const occupancyPassed = evaluateOccupancy(strategy, occupants, context, payload);
  const replacementTargets = buildReplacementTargets(strategy, occupants, occupancyPassed);
  const canPlace = customCanPlace
    ? customCanPlace(context, payload)
    : buildabilityPassed && occupancyPassed;

  return {
    footprint: strategy.footprint,
    cells,
    occupants,
    replacementTargets,
    buildabilityPassed,
    occupancyPassed,
    canPlace,
    payload,
  };
}

function resolvePlacementStrategy<TPayload>(
  definition: PlacementRuleDefinition<TPayload>,
): ResolvedPlacementStrategy<TPayload> {
  return {
    footprint: definition.footprint ?? PlacementFootprintUtils.unit,
    requiresBuildableArea: definition.placementStrategy?.requiresBuildableArea ?? definition.item !== "land-claim",
    queries: resolvePlacementQueries(definition.placementStrategy),
    layers: definition.placementStrategy?.layers ?? (COLLISION_LAYERS.SOLID | COLLISION_LAYERS.CONVEYOR),
    strategy: definition.placementStrategy?.strategy ?? "block",
    compatibilityGroup: definition.placementStrategy?.compatibilityGroup,
    resolveOccupantCompatibilityGroup: definition.placementStrategy?.resolveOccupantCompatibilityGroup,
    replaceableLayers: definition.placementStrategy?.replaceableLayers,
    canReplace: definition.placementStrategy?.canReplace,
  };
}

function resolvePlacementQueries<TPayload>(
  strategy: PlacementStrategy<TPayload> | undefined,
): readonly PlacementOccupancyQuery[] {
  if (strategy?.queries && strategy.queries.length > 0) {
    const queries: PlacementOccupancyQuery[] = [];

    for (const query of strategy.queries) {
      if (queries.includes(query)) {
        continue;
      }

      queries.push(query);
    }

    return queries;
  }

  if (strategy?.query) {
    return [strategy.query];
  }

  return DEFAULT_PLACEMENT_QUERIES;
}

function queryPlacementOccupantsAtCoordinates<TPayload>(
  strategy: ResolvedPlacementStrategy<TPayload>,
  world: UserWorld,
  gridCoordinates: GridCoordinates,
): PhysicsBody[] {
  const [firstQuery] = strategy.queries;

  if (strategy.queries.length === 1 && firstQuery !== undefined) {
    return queryPlacementOccupantsByQuery(firstQuery, world, gridCoordinates, strategy.layers);
  }

  const occupantsByEntityId = new Map<number, PhysicsBody>();

  for (const query of strategy.queries) {
    const occupants = queryPlacementOccupantsByQuery(query, world, gridCoordinates, strategy.layers);

    for (const occupant of occupants) {
      occupantsByEntityId.set(occupant.entityId, occupant);
    }
  }

  return [...occupantsByEntityId.values()];
}

function queryPlacementOccupantsByQuery(
  query: PlacementOccupancyQuery,
  world: UserWorld,
  gridCoordinates: GridCoordinates,
  layers: bigint,
): PhysicsBody[] {
  if (query === "grid") {
    return PlacementQueries.queryPlacementOccupantsByGrid(world, gridCoordinates, layers);
  }

  const overlap = PlacementQueries.queryFirstPlacementOverlap(world, gridCoordinates, layers);

  if (overlap === undefined) {
    return [];
  }

  return [overlap];
}

function evaluateOccupancy<TPayload>(
  strategy: ResolvedPlacementStrategy<TPayload>,
  occupants: PhysicsBody[],
  context: PlacementContext,
  payload?: TPayload,
): boolean {
  if (typeof strategy.strategy === "function") {
    return strategy.strategy(occupants, context, payload);
  }

  if (strategy.strategy === "replace") {
    if (occupants.length === 0) {
      return true;
    }

    if (strategy.canReplace) {
      return occupants.every((occupant) => strategy.canReplace?.(occupant, context, payload) === true);
    }

    if (strategy.compatibilityGroup) {
      const compatibilityGroup = strategy.compatibilityGroup;

      return occupants.every((occupant) => belongsToCompatibilityGroup(
        context.world,
        occupant,
        compatibilityGroup,
        strategy.resolveOccupantCompatibilityGroup,
      ));
    }

    const replaceableLayers = strategy.replaceableLayers;

    if (replaceableLayers === undefined || replaceableLayers === 0n) {
      return false;
    }

    return occupants.every((occupant) => inLayer(occupant.participation.layers, replaceableLayers));
  }

  return occupants.length === 0;
}

function buildReplacementTargets<TPayload>(
  strategy: ResolvedPlacementStrategy<TPayload>,
  occupants: PhysicsBody[],
  occupancyPassed: boolean,
): PhysicsBody[] {
  if (!occupancyPassed || strategy.strategy !== "replace" || occupants.length === 0) {
    return [];
  }

  return occupants;
}

function belongsToCompatibilityGroup(
  world: UserWorld,
  occupant: PhysicsBody,
  compatibilityGroup: string,
  resolveOccupantCompatibilityGroup?: PlacementOccupantCompatibilityGroupResolver,
): boolean {
  if (resolveOccupantCompatibilityGroup) {
    return resolveOccupantCompatibilityGroup(world, occupant) === compatibilityGroup;
  }

  const placeable = world.get(occupant.entityId, Placeable);

  if (!placeable) {
    return false;
  }

  return placeable.itemType === compatibilityGroup;
}

function forEachFootprintCoordinate(
  origin: GridCoordinates,
  footprint: PlacementFootprint,
  visit: (gridCoordinates: GridCoordinates) => void,
): void {
  const [originX, originY] = origin;
  const baseX = Number(originX);
  const baseY = Number(originY);

  for (let offsetY = 0; offsetY < footprint.height; offsetY += 1) {
    for (let offsetX = 0; offsetX < footprint.width; offsetX += 1) {
      visit([
        (baseX + offsetX) as GridCoordinate,
        (baseY + offsetY) as GridCoordinate,
      ]);
    }
  }
}