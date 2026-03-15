import { GhostPreviewScopeUtils } from "@client/entities/ghost";
import { getLocalPlayerOwnerId } from "@client/entities/player/actions";
import { supportsDragPlacement } from "@client/systems/world/build-mode/build-items";
import {
    buildModeStateDefault,
    type BuildModeState,
} from "@client/systems/world/build-mode/const";
import { BuildModeDragPlacement } from "@client/systems/world/build-mode/drag-placement";
import {
    GridSingleton,
} from "@client/systems/world/build-mode/grid-singleton";
import { InputManager } from '@client/systems/world/build-mode/input';
import { Placement } from "@client/systems/world/build-mode/placement";
import { resolvePlacementWorld } from "@client/systems/world/build-mode/placement-target";
import {
    commitResolvedPlacement,
    resolvePlacementRenderVisibilityRole,
} from "@client/systems/world/build-mode/utils";
import {
    createSystem,
} from "@engine";
import { System as ContextSystem, Engine, fromContext, FromEngine, Mouse } from "@engine/context";
import { ActiveCameraView } from "@engine/context-utils";
import { SpatialContexts } from "@libs/spatial-contexts";
import { BuildModeDomEvents } from "./dom/events";
import { HUDManager } from "./dom/hud";

export const System = createSystem("main:build-mode")({
  state: buildModeStateDefault as BuildModeState,
  initialize() {
    const unbindHud = HUDManager.create();
    const unbindDomEvents = BuildModeDomEvents.create();

    return () => {
      unbindDomEvents();
      unbindHud();
    };
  },
  system() {
    /***** CONTEXT *****/
    const { data } = fromContext(ContextSystem("main:build-mode"));
    const engine = fromContext(Engine);
    const mouse = fromContext(Mouse);
    const rootWorld = fromContext(FromEngine.World);

    const manager = SpatialContexts.requireManager(engine.scene.context);
    const focusedWorld = manager.focusedWorld;
    const sceneWorlds = engine.scene.context.worlds;
    const localGhostOwnerId = getLocalPlayerOwnerId({ focusedWorld, rootWorld, sceneWorlds });

    // Check for relevant keybinds and update state accordingly.
    InputManager.match();

    // If the place pointer is active but the selected item doesn't support drag placement, 
    // reset the place pointer state.
    BuildModeDragPlacement.syncSession(data);

    // Update the HUD with the currently selected item.
    HUDManager.update();

    const camera = fromContext(ActiveCameraView(focusedWorld));
    const worldPointer = mouse.world(camera);

    const gridCoordinates = GridSingleton.worldToGridCoordinates(worldPointer.x, worldPointer.y);

    const placementTarget = resolvePlacementWorld(engine, worldPointer);
    const commitWorld = placementTarget.commitWorld;
    const resolvedPlacement = placementTarget.blocked || commitWorld === undefined
      ? null
      : Placement.resolveSelection(placementTarget, gridCoordinates, data);

    if (data.selectedItem === null) {
      GhostPreviewScopeUtils.destroyOwnedGhostsInWorlds(rootWorld, sceneWorlds, localGhostOwnerId);
      data.ghostEntityId = null;
    } else {
      GhostPreviewScopeUtils.pruneGhosts(
        rootWorld,
        placementTarget.previewWorld,
        sceneWorlds,
        localGhostOwnerId,
      );
    }

    if (data.selectedItem === null || resolvedPlacement === null) {
      GhostPreviewScopeUtils.destroyOwnedGhosts(placementTarget.previewWorld, localGhostOwnerId);
      data.ghostEntityId = null;
    } else {
      data.ghostEntityId = resolvedPlacement.preview.sync(data.ghostEntityId, localGhostOwnerId);
    }

    const shouldDelete = data.pendingDelete;
    const shouldPlaceSingle = data.pendingPlace;
    data.pendingDelete = false;
    data.pendingPlace = false;

    if (shouldDelete && !placementTarget.blocked && commitWorld) {
      Placement.deleteAt(commitWorld, worldPointer);
    }

    if (!commitWorld || placementTarget.blocked) {
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

    for (const resolvedBatchPlacement of Placement.resolveSelectionBatch(
      placementTarget,
      dragPlacementBatch.candidates,
      data,
    )) {
      if (!resolvedBatchPlacement.canPlace) {
        break;
      }

      resolvedBatchPlacement.commit.execute(renderVisibilityRole);
      BuildModeDragPlacement.recordPlacement(data, resolvedBatchPlacement.intent.context.gridCoordinates);
    }
  },
});
