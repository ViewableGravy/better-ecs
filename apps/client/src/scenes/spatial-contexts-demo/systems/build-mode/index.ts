import type { RenderVisibilityRole } from "@/scenes/spatial-contexts-demo/components/render-visibility";
import { HOUSE_INTERIOR, OUTSIDE } from "@/scenes/spatial-contexts-demo/components/render-visibility";
import { spawnBox } from "@/scenes/spatial-contexts-demo/factories/spawnBox";
import { createSystem, useEngine, useMouse, useSystem, type RegisteredEngine } from "@repo/engine";
import { resolveCameraView } from "@repo/engine/components";
import { ensureManager, type ContextId } from "@repo/spatial-contexts";
import { GhostPreview } from "./components";
import { buildModeStateDefault, buildModeStateSchema } from "./const";
import { bindBuildModeDomEvents } from "./events";
import { HUD } from "./hud";
import * as Keybinds from './input';
import { Placement } from "./placement";
import { resolvePlacementWorld } from "./placement-target";

export const System = createSystem("main:build-mode")({
  schema: {
    default: buildModeStateDefault,
    schema: buildModeStateSchema,
  },
  initialize() {
    const canvas = useEngine().canvas;
    if (!canvas) {
      throw new Error("Engine canvas is required before build-mode initialization");
    }

    const unbindHud = HUD.create();
    const unbindDomEvents = bindBuildModeDomEvents(canvas);

    return () => {
      unbindDomEvents();
      unbindHud();
    };
  },
  system() {
    const { data } = useSystem("main:build-mode");
    const engine = useEngine();
    const mouse = useMouse();

    const manager = ensureManager(engine.scene.context);
    const focusedWorld = manager.focusedWorld;
    const sceneWorlds = engine.scene.context.worlds;

    Keybinds.matchKeybinds();
    HUD.update();

    const camera = resolveCameraView(focusedWorld);
    const worldPointer = mouse.world(camera);

    const snappedX = Placement.snapToGrid(worldPointer.x);
    const snappedY = Placement.snapToGrid(worldPointer.y);
    const placementTarget = resolvePlacementWorld(engine, worldPointer);
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
      data.ghostEntityId = GhostPreview.sync(
        focusedWorld,
        data.ghostEntityId,
        snappedX,
        snappedY,
      );
    }

    const shouldDelete = data.pendingDelete;
    const shouldPlace = data.pendingPlace;
    data.pendingDelete = false;
    data.pendingPlace = false;

    if (shouldDelete && !placementTarget.blocked && placementWorld) {
      Placement.deleteAt(placementWorld, worldPointer);
    }

    if (!shouldPlace || data.selectedItem !== "box" || placementTarget.blocked) {
      return;
    }

    if (!placementWorld) {
      return;
    }

    if (!Placement.canSpawnBox(placementWorld, snappedX, snappedY)) {
      return;
    }

    spawnBox(placementWorld, {
      snappedX,
      snappedY,
      renderVisibilityRole: resolvePlacementRenderVisibilityRole(engine, placementTarget.contextId),
    });
  },
});

function resolvePlacementRenderVisibilityRole(
  engine: RegisteredEngine,
  placementContextId: ContextId | undefined,
): RenderVisibilityRole {
  const manager = ensureManager(engine.scene.context);

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
