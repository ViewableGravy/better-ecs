import { supportsDragPlacement } from "@client/systems/world/build-mode/build-items";
import { BuildModeDragPlacement } from "@client/systems/world/build-mode/drag-placement";
import { Placement } from "@client/systems/world/build-mode/placement";
import {
    commitResolvedPlacement,
    resolveActivePlacement,
    resolvePlacementRenderVisibilityRole,
} from "@client/systems/world/build-mode/utils";
import { createSystem } from "@engine";
import { System as ContextSystem, Engine, fromContext, Mouse } from "@engine/context";
import { ActiveCameraView } from "@engine/context-utils";
import { SpatialContexts } from "@libs/spatial-contexts";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export const System = createSystem("main:build-mode-authority")({
  system() {
    const { data } = fromContext(ContextSystem("main:build-mode"));
    const engine = fromContext(Engine);
    const mouse = fromContext(Mouse);

    const manager = SpatialContexts.requireManager(engine.scene.context);
    const camera = fromContext(ActiveCameraView(manager.focusedWorld));
    const worldPointer = mouse.world(camera);
    const { gridCoordinates, placementTarget, resolvedPlacement } = resolveActivePlacement(engine, worldPointer, data);

    const shouldDelete = data.pendingDelete;
    const shouldPlaceSingle = data.pendingPlace;
    
    data.pendingDelete = false;
    data.pendingPlace = false;

    if (shouldDelete && !placementTarget.blocked && placementTarget.commitWorld) {
      Placement.deleteAt(placementTarget.commitWorld, worldPointer);
    }

    if (!placementTarget.commitWorld || placementTarget.blocked) {
      return;
    }

    const renderVisibilityRole = resolvePlacementRenderVisibilityRole(
      engine,
      placementTarget.commitContextId,
    );

    if (!supportsDragPlacement(data.selectedItem)) {
      if (shouldPlaceSingle && resolvedPlacement?.canPlace) {
        commitResolvedPlacement(resolvedPlacement, data, renderVisibilityRole);
      }

      return;
    }

    const dragPlacementBatch = BuildModeDragPlacement.resolvePlacementBatch(data, gridCoordinates);
    const resolvedBatchPlacements = Placement.resolveSelectionBatch(
      placementTarget,
      dragPlacementBatch.candidates,
      data,
    );

    for (const resolvedBatchPlacement of resolvedBatchPlacements) {
      if (!resolvedBatchPlacement.canPlace) {
        break;
      }

      resolvedBatchPlacement.commit.execute(renderVisibilityRole);
      BuildModeDragPlacement.recordPlacement(data, resolvedBatchPlacement.intent.context.gridCoordinates);
    }
  },
});