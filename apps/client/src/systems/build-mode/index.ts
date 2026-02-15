import { invariantById } from "@/utilities/selectors";
import { resolveCameraView, screenToWorld } from "@/utilities/world-camera";
import { createSystem, useEngine, useSystem, useWorld } from "@repo/engine";
import { syncColliderDebugWorld } from "./collider-debug";
import { ColliderDebugProxy, GhostPreview } from "./components";
import { bindBuildModeDomEvents } from "./events";
import { syncPlacementGhost } from "./ghost";
import { ensureHotbarIndicator, removeHotbarIndicator, updateHotbarIndicator } from "./hud";
import { handleBuildModeKeybinds } from "./input";
import { deleteAt, placeBox, snapToGrid } from "./placement";
import { buildModeState } from "./state";
import { destroyEntitiesWithComponent } from "./transient";

export const System = createSystem("demo:build-mode")({
  initialize() {
    const canvas = invariantById<HTMLCanvasElement>("game");

    ensureHotbarIndicator();
    const unbindDomEvents = bindBuildModeDomEvents(canvas, buildModeState);

    return () => {
      unbindDomEvents();
      removeHotbarIndicator();
    };
  },
  system() {
    const engine = useEngine();
    const world = useWorld();
    const input = useSystem("engine:input");

    const sceneWorlds = [...engine.scene.context.worlds];

    handleBuildModeKeybinds(buildModeState, input.matchKeybind);
    updateHotbarIndicator(buildModeState);

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const camera = resolveCameraView(world, viewportHeight);
    const worldPointer = screenToWorld(
      buildModeState.mouseScreenX,
      buildModeState.mouseScreenY,
      viewportWidth,
      viewportHeight,
      camera,
    );

    const snappedX = snapToGrid(worldPointer.x);
    const snappedY = snapToGrid(worldPointer.y);

    // Keep ghosts scoped to the active world only.
    // This avoids leaked transient entities during world/context transitions.
    for (const sceneWorld of sceneWorlds) {
      if (sceneWorld !== world) {
        destroyEntitiesWithComponent([sceneWorld], GhostPreview);
      }
    }

    if (buildModeState.selectedItem === null) {
      destroyEntitiesWithComponent([world], GhostPreview);
      buildModeState.ghostEntityId = null;
    } else {
      buildModeState.ghostEntityId = syncPlacementGhost(world, buildModeState.ghostEntityId, snappedX, snappedY);
    }

    if (!buildModeState.colliderDebugVisible) {
      destroyEntitiesWithComponent(sceneWorlds, ColliderDebugProxy);
    } else {
      for (const sceneWorld of sceneWorlds) {
        syncColliderDebugWorld(sceneWorld);
      }
    }

    const shouldDelete = buildModeState.pendingDelete;
    const shouldPlace = buildModeState.pendingPlace;
    buildModeState.pendingDelete = false;
    buildModeState.pendingPlace = false;

    if (shouldDelete) {
      deleteAt(world, worldPointer.x, worldPointer.y);
    }

    if (!shouldPlace || buildModeState.selectedItem !== "box") {
      return;
    }

    placeBox(world, snappedX, snappedY);
  },
});
