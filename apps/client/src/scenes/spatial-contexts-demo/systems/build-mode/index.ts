import type { RenderVisibilityRole } from "@/scenes/spatial-contexts-demo/components/render-visibility";
import { invariantById } from "@/utilities/selectors";
import { resolveCameraView, screenToWorld } from "@/utilities/world-camera";
import { createSystem, useEngine, useSystem } from "@repo/engine";
import { ensureManager, type ContextId } from "@repo/spatial-contexts";
import { syncColliderDebugWorld } from "./collider-debug";
import { ColliderDebugProxy, GhostPreview } from "./components";
import { bindBuildModeDomEvents } from "./events";
import { syncPlacementGhost } from "./ghost";
import { ensureHotbarIndicator, removeHotbarIndicator, updateHotbarIndicator } from "./hud";
import { handleBuildModeKeybinds } from "./input";
import { Placement } from "./placement";
import { resolvePlacementWorld } from "./placement-target";
import { buildModeState } from "./state";

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
    const input = useSystem("engine:input");
    const engine = useEngine();

    const manager = ensureManager(engine.scene.context);
    const focusedWorld = manager.getFocusedWorld();
    const sceneWorlds = engine.scene.context.worlds;

    handleBuildModeKeybinds(buildModeState, input.matchKeybind);
    updateHotbarIndicator(buildModeState);

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const camera = resolveCameraView(focusedWorld, viewportHeight);
    const worldPointerX = screenToWorld(
      buildModeState.mouseScreenX,
      viewportWidth,
      camera.x,
      camera.zoom,
    );
    const worldPointerY = screenToWorld(
      buildModeState.mouseScreenY,
      viewportHeight,
      camera.y,
      camera.zoom,
    );

    const snappedX = Placement.snapToGrid(worldPointerX);
    const snappedY = Placement.snapToGrid(worldPointerY);
    const placementTarget = resolvePlacementWorld(engine, worldPointerX, worldPointerY);
    const placementWorld = placementTarget.world;

    // Keep ghosts scoped to the active world only.
    // This avoids leaked transient entities during world/context transitions.
    for (const sceneWorld of sceneWorlds) {
      if (sceneWorld !== focusedWorld) {
        sceneWorld.destroy(GhostPreview);
      }
    }

    if (buildModeState.selectedItem === null || placementTarget.blocked) {
      focusedWorld.destroy(GhostPreview);
      buildModeState.ghostEntityId = null;
    } else {
      buildModeState.ghostEntityId = syncPlacementGhost(
        focusedWorld,
        buildModeState.ghostEntityId,
        snappedX,
        snappedY,
      );
    }

    for (const sceneWorld of sceneWorlds) {
      if (!buildModeState.colliderDebugVisible) {
        sceneWorld.destroy(ColliderDebugProxy);
      } else {
        syncColliderDebugWorld(sceneWorld);
      }
    }

    const shouldDelete = buildModeState.pendingDelete;
    const shouldPlace = buildModeState.pendingPlace;
    buildModeState.pendingDelete = false;
    buildModeState.pendingPlace = false;

    if (shouldDelete && !placementTarget.blocked && placementWorld) {
      Placement.deleteAt(placementWorld, worldPointerX, worldPointerY);
    }

    if (!shouldPlace || buildModeState.selectedItem !== "box" || placementTarget.blocked) {
      return;
    }

    if (!placementWorld) {
      return;
    }

    Placement.spawnBox(
      placementWorld,
      snappedX,
      snappedY,
      resolvePlacementRenderVisibilityRole(engine, placementTarget.contextId),
    );
  },
});

function resolvePlacementRenderVisibilityRole(
  engine: ReturnType<typeof useEngine>,
  placementContextId: ContextId | undefined,
): RenderVisibilityRole {
  const manager = ensureManager(engine.scene.context);

  const focusedContextId = manager.getFocusedContextId();
  if (!placementContextId || placementContextId !== focusedContextId) {
    return "outside";
  }

  const rootContextId = manager.getRootContextId();

  if (focusedContextId === rootContextId) {
    return "outside";
  }

  return "house-interior";
}
