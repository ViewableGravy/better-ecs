import { GhostPreviewScopeUtils } from "@client/entities/ghost";
import { getLocalPlayerOwnerId } from "@client/entities/player/actions";
import {
    buildModeStateDefault,
    type BuildModeState,
} from "@client/systems/world/build-mode/const";
import { BuildModeDragPlacement } from "@client/systems/world/build-mode/drag-placement";
import { InputManager } from "@client/systems/world/build-mode/input";
import {
    resolveActivePlacement,
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
    const { placementTarget, resolvedPlacement } = resolveActivePlacement(engine, worldPointer, data);

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
  },
});
