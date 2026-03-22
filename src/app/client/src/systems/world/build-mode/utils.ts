import type { RenderVisibilityRole } from "@client/components/render-visibility";
import { HOUSE_INTERIOR, OUTSIDE } from "@client/components/render-visibility";
import { BuildModeDragPlacement } from "@client/systems/world/build-mode/drag-placement";
import { type GridCoordinates, GridSingleton } from "@client/systems/world/build-mode/grid-singleton";
import { Placement } from "@client/systems/world/build-mode/placement";
import {
    type PlacementTargetResolution,
    resolvePlacementWorld,
} from "@client/systems/world/build-mode/placement-target";
import {
    type RegisteredResolvedPlacement,
} from "@client/systems/world/build-mode/placement/registry";
import type { MousePoint, RegisteredEngine, RegisteredSystems } from "@engine";
import { type ContextId, SpatialContexts } from "@libs/spatial-contexts";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/

type ResolvedPlacement = NonNullable<ReturnType<typeof Placement.resolveSelection>>;
type BuildModeSystemData = RegisteredSystems["main:build-mode"]["data"];

type ActiveBuildModePlacement = {
  gridCoordinates: GridCoordinates;
  placementTarget: PlacementTargetResolution;
  resolvedPlacement: RegisteredResolvedPlacement | null;
};

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export function commitResolvedPlacement(
  resolvedPlacement: ResolvedPlacement,
  data: BuildModeSystemData,
  renderVisibilityRole: RenderVisibilityRole,
): void {
  resolvedPlacement.commit.execute(renderVisibilityRole);
  BuildModeDragPlacement.recordPlacement(data, resolvedPlacement.intent.context.gridCoordinates);
}

export function resolvePlacementRenderVisibilityRole(
  engine: RegisteredEngine,
  placementContextId: ContextId | undefined,
): RenderVisibilityRole {
  const manager = SpatialContexts.requireManager(engine.scene.context);

  const focusedContextId = manager.focusedContextId;
  if (!placementContextId || placementContextId !== focusedContextId) {
    return OUTSIDE;
  }

  const rootContextId = manager.rootContextId;

  if (focusedContextId === rootContextId) {
    return OUTSIDE;
  }

  return HOUSE_INTERIOR;
}

export function resolveActivePlacement(
  engine: RegisteredEngine,
  worldPointer: MousePoint,
  buildModeState: BuildModeSystemData,
): ActiveBuildModePlacement {
  const gridCoordinates = GridSingleton.worldToGridCoordinates(worldPointer.x, worldPointer.y);
  const placementTarget = resolvePlacementWorld(engine, worldPointer);
  const resolvedPlacement = placementTarget.blocked || placementTarget.commitWorld === undefined
    ? null
    : Placement.resolveSelection(placementTarget, gridCoordinates, buildModeState);

  return {
    gridCoordinates,
    placementTarget,
    resolvedPlacement,
  };
}