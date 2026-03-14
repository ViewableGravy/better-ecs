import type { RenderVisibilityRole } from "@client/components/render-visibility";
import { HOUSE_INTERIOR, OUTSIDE } from "@client/components/render-visibility";
import { BuildModeDragPlacement } from "@client/systems/world/build-mode/drag-placement";
import { Placement } from "@client/systems/world/build-mode/placement";
import type { RegisteredEngine, RegisteredSystems } from "@engine";
import { SpatialContexts, type ContextId } from "@libs/spatial-contexts";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/

type ResolvedPlacement = NonNullable<ReturnType<typeof Placement.resolveSelection>>;
type BuildModeSystemData = RegisteredSystems["main:build-mode"]["data"];

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