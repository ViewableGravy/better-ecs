import { GhostUtils } from "@client/entities/ghost";
import { getLocalPlayerOwnerId } from "@client/entities/player/actions";
import { createSystem } from "@engine";
import { ActiveRegistry, System as ContextSystem, Engine, fromContext, Mouse } from "@engine/context";
import { ActiveCameraView } from "@engine/context-utils";

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
    const registry = fromContext(ActiveRegistry);
    const localGhostOwnerId = getLocalPlayerOwnerId(registry);

    HUDManager.update();

    const camera = fromContext(ActiveCameraView(registry));
    const worldPointer = mouse.world(camera);
    const { placementTarget, resolvedPlacement } = resolveActivePlacement(engine, worldPointer, data);

    if (data.selectedItem === null) {
      GhostUtils.destroyOwned(registry, localGhostOwnerId);
      data.ghostEntityId = null;
    }

    if (data.selectedItem === null || resolvedPlacement === null) {
      GhostUtils.destroyOwned(placementTarget.previewWorld, localGhostOwnerId);
      data.ghostEntityId = null;
      return;
    }

    data.ghostEntityId = resolvedPlacement.preview.sync(data.ghostEntityId, localGhostOwnerId);
  },
});
