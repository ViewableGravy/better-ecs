import { type GridCoordinates, GridSingleton } from "@legacy/systems/world/build-mode/grid-singleton";
import { Placement } from "@legacy/systems/world/build-mode/placement";
import {
    type PlacementTargetResolution,
    resolvePlacementWorld,
} from "@legacy/systems/world/build-mode/placement-target";
import {
    type RegisteredResolvedPlacement,
} from "@legacy/systems/world/build-mode/placement/registry";
import type { MousePoint, RegisteredEngine, RegisteredSystems } from "@engine";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/

type BuildModeIntentSystemData = RegisteredSystems["main:build-mode-intent"]["data"];

type ActiveBuildModePlacement = {
  gridCoordinates: GridCoordinates;
  placementTarget: PlacementTargetResolution;
  resolvedPlacement: RegisteredResolvedPlacement | null;
};

export type BuildModePlacementTarget = {
  gridCoordinates: GridCoordinates;
  placementTarget: PlacementTargetResolution;
};

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export function resolveBuildModePlacementTarget(
  engine: RegisteredEngine,
  worldPointer: MousePoint,
): BuildModePlacementTarget {
  return {
    gridCoordinates: GridSingleton.worldToGridCoordinates(worldPointer.x, worldPointer.y),
    placementTarget: resolvePlacementWorld(engine),
  };
}

export function resolveActivePlacement(
  engine: RegisteredEngine,
  worldPointer: MousePoint,
  buildModeState: BuildModeIntentSystemData,
): ActiveBuildModePlacement {
  const { gridCoordinates, placementTarget } = resolveBuildModePlacementTarget(engine, worldPointer);
  const resolvedPlacement = placementTarget.blocked || placementTarget.commitWorld === undefined
    ? null
    : Placement.resolveSelection(placementTarget, gridCoordinates, buildModeState);

  return {
    gridCoordinates,
    placementTarget,
    resolvedPlacement,
  };
}
