import { GhostPreviewScopeUtils } from "@client/entities/ghost";
import { getLocalPlayerOwnerId } from "@client/entities/player/actions";
import { createSystem } from "@engine";
import { System as ContextSystem, Engine, fromContext, FromEngine, Mouse } from "@engine/context";
import { ActiveCameraView } from "@engine/context-utils";
import { SpatialContexts } from "@libs/spatial-contexts";

import { BuildModeDomEvents } from "@client/systems/world/build-mode/dom/events";
import { HUDManager } from "@client/systems/world/build-mode/dom/hud";
import { resolveActivePlacement } from "@client/systems/world/build-mode/utils";

export const System = createSystem("main:build-mode-presentation")({
  initialize() {
    const unbindHud = HUDManager.create();
    const unbindDomEvents = BuildModeDomEvents.create();

    return () => {
      unbindDomEvents();
      unbindHud();
    };
  },
  system() {
    const { data } = fromContext(ContextSystem("main:build-mode-intent"));
    const engine = fromContext(Engine);
    const mouse = fromContext(Mouse);
    const rootWorld = fromContext(FromEngine.World);

    const manager = SpatialContexts.requireManager(engine.scene.context);
    const focusedWorld = manager.focusedWorld;
    const sceneWorlds = engine.scene.context.worlds;
    const localGhostOwnerId = getLocalPlayerOwnerId({ focusedWorld, rootWorld, sceneWorlds });

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
      return;
    }

    data.ghostEntityId = resolvedPlacement.preview.sync(data.ghostEntityId, localGhostOwnerId);
  },
});