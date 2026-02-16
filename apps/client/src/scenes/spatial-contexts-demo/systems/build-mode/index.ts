import type { RenderVisibilityRole } from "@/scenes/spatial-contexts-demo/components/render-visibility";
import { HOUSE_INTERIOR, OUTSIDE } from "@/scenes/spatial-contexts-demo/components/render-visibility";
import { spawnBox } from "@/scenes/spatial-contexts-demo/factories/spawnBox";
import { createSystem, useEngine, useMouse, useSystem, type RegisteredEngine, type RegisteredSystems } from "@repo/engine";
import { resolveCameraView } from "@repo/engine/components";
import { SpatialContexts, type ContextId } from "@repo/spatial-contexts";
import { GhostPreview } from "./components";
import { buildModeStateDefault, buildModeStateSchema } from "./const";
import { BuildModeDomEvents, HUD } from "./dom";
import * as Keybinds from './input';
import { Placement } from "./placement";
import { resolvePlacementWorld, type PlacementWorldResolution } from "./placement-target";

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
    const unbindDomEvents = BuildModeDomEvents.create();

    return () => {
      unbindDomEvents();
      unbindHud();
    };
  },
  system() {
    const { data } = useSystem("main:build-mode");
    const engine = useEngine();
    const mouse = useMouse();

    const manager = SpatialContexts.requireManager(engine.scene.context);
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

    if (placementTarget.world) {
      if (shouldSpawnBox(shouldPlace, placementTarget, data, snappedX, snappedY)) {
        spawnBox(placementTarget.world, {
          snappedX,
          snappedY,
          renderVisibilityRole: resolvePlacementRenderVisibilityRole(
            engine, 
            placementTarget.contextId
          ),
        });
      }
    }
  },
});

function shouldSpawnBox(
  shouldPlace: boolean,
  placementTarget: PlacementWorldResolution,
  data: RegisteredSystems["main:build-mode"]["data"],
  snappedX: number,
  snappedY: number,
): boolean {
  // Early exit if the place action wasn't triggered to avoid unnecessary checks
  if (!shouldPlace) {
    return false;
  }

  // User must have selected a box to place from the hotbar (1)
  if (data.selectedItem !== "box") {
    return false;
  }

  // Placement must not be blocked (e.g. by UI or invalid world) (2)
  if (placementTarget.blocked) {
    return false;
  }

  // There must be a valid world to place into (3)
  if (!placementTarget.world) {
    return false;
  }

  // The box must not collide with anything in the world (4)
  if (!Placement.canSpawnBox(placementTarget.world, snappedX, snappedY)) {
    return false;
  }

  return true;
}

function resolvePlacementRenderVisibilityRole(
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
