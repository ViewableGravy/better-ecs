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
import { buildModeStateDefault, buildModeStateSchema } from "./state";

export const System = createSystem("demo:build-mode")({
  schema: {
    default: buildModeStateDefault,
    schema: buildModeStateSchema,
  },
  initialize() {
    const canvas = invariantById<HTMLCanvasElement>("game");

    ensureHotbarIndicator();
    const unbindDomEvents = bindBuildModeDomEvents(canvas);

    return () => {
      unbindDomEvents();
      removeHotbarIndicator();
    };
  },
  system() {
    const input = useSystem("engine:input");
    const { data } = useSystem("demo:build-mode");
    const engine = useEngine();

    const manager = ensureManager(engine.scene.context);
    const focusedWorld = manager.getFocusedWorld();
    const sceneWorlds = engine.scene.context.worlds;

    handleBuildModeKeybinds(input.matchKeybind);
    updateHotbarIndicator();

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const camera = resolveCameraView(focusedWorld, viewportHeight);
    const worldPointerX = screenToWorld(
      data.mouseScreenX,
      viewportWidth,
      camera.x,
      camera.zoom,
    );
    const worldPointerY = screenToWorld(
      data.mouseScreenY,
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

    if (data.selectedItem === null || placementTarget.blocked) {
      focusedWorld.destroy(GhostPreview);
      data.ghostEntityId = null;
    } else {
      data.ghostEntityId = syncPlacementGhost(
        focusedWorld,
        data.ghostEntityId,
        snappedX,
        snappedY,
      );
    }

    for (const sceneWorld of sceneWorlds) {
      if (!data.colliderDebugVisible) {
        sceneWorld.destroy(ColliderDebugProxy);
      } else {
        syncColliderDebugWorld(sceneWorld);
      }
    }

    const shouldDelete = data.pendingDelete;
    const shouldPlace = data.pendingPlace;
    data.pendingDelete = false;
    data.pendingPlace = false;

    if (shouldDelete && !placementTarget.blocked && placementWorld) {
      Placement.deleteAt(placementWorld, worldPointerX, worldPointerY);
    }

    if (!shouldPlace || data.selectedItem !== "box" || placementTarget.blocked) {
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
