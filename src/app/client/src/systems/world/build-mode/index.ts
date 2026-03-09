import type { RenderVisibilityRole } from "@client/components/render-visibility";
import { HOUSE_INTERIOR, OUTSIDE } from "@client/components/render-visibility";
import { GhostPreviewComponent, GhostPreviewScopeUtils } from "@client/entities/ghost";
import {
  buildModeStateDefault,
  buildModeStateSchema,
} from "@client/systems/world/build-mode/const";
import { BuildModeDomEvents, HUD } from "@client/systems/world/build-mode/dom";
import { GridSingleton } from "@client/systems/world/build-mode/grid-singleton";
import * as Keybinds from '@client/systems/world/build-mode/input';
import { Placement } from "@client/systems/world/build-mode/placement";
import { resolvePlacementWorld, type PlacementWorldResolution } from "@client/systems/world/build-mode/placement-target";
import { createSystem, type RegisteredEngine, type RegisteredSystems } from "@engine";
import { System as ContextSystem, Engine, fromContext, FromEngine, Mouse } from "@engine/context";
import { ActiveCameraView } from "@engine/context-utils";
import { SpatialContexts, type ContextId } from "@libs/spatial-contexts";

export const System = createSystem("main:build-mode")({
  schema: {
    default: buildModeStateDefault,
    schema: buildModeStateSchema,
  },
  initialize() {
    const unbindHud = HUD.create();
    const unbindDomEvents = BuildModeDomEvents.create();

    return () => {
      unbindDomEvents();
      unbindHud();
    };
  },
  system() {
    const { data } = fromContext(ContextSystem("main:build-mode"));
    const engine = fromContext(Engine);
    const mouse = fromContext(Mouse);
    const rootWorld = fromContext(FromEngine.World);

    const manager = SpatialContexts.requireManager(engine.scene.context);
    const focusedWorld = manager.focusedWorld;
    const sceneWorlds = engine.scene.context.worlds;

    Keybinds.matchKeybinds();
    HUD.update();

    const camera = fromContext(ActiveCameraView(focusedWorld));
    const worldPointer = mouse.world(camera);

    const gridCoordinates = GridSingleton.worldToGridCoordinates(worldPointer.x, worldPointer.y);

    const placementTarget = resolvePlacementWorld(engine, worldPointer);
    const placementWorld = placementTarget.world;
    const resolvedPlacement = placementTarget.blocked || placementWorld === undefined
      ? null
      : Placement.resolveSelection(placementWorld, gridCoordinates, data);

    GhostPreviewScopeUtils.pruneGhosts(rootWorld, focusedWorld, sceneWorlds);

    if (data.selectedItem === null || resolvedPlacement === null) {
      focusedWorld.destroy(GhostPreviewComponent);
      data.ghostEntityId = null;
    } else {
      data.ghostEntityId = resolvedPlacement.syncGhost(focusedWorld, data.ghostEntityId);
    }

    const shouldDelete = data.pendingDelete;
    const shouldPlace = data.pendingPlace;
    data.pendingDelete = false;
    data.pendingPlace = false;

    if (shouldDelete && !placementTarget.blocked && placementWorld) {
      Placement.deleteAt(placementWorld, worldPointer);
    }

    if (placementTarget.world && resolvedPlacement) {
      if (shouldSpawnPlacement(shouldPlace, placementTarget, data, resolvedPlacement)) {
        const renderVisibilityRole = resolvePlacementRenderVisibilityRole(
          engine,
          placementTarget.contextId,
        );

        resolvedPlacement.spawn(renderVisibilityRole);
      }
    }
  },
});

function shouldSpawnPlacement(
  shouldPlace: boolean,
  placementTarget: PlacementWorldResolution,
  data: RegisteredSystems["main:build-mode"]["data"],
  resolvedPlacement: { canPlace: boolean },
): boolean {
  // Early exit if the place action wasn't triggered to avoid unnecessary checks
  if (!shouldPlace) {
    return false;
  }

  // User must have selected an item to place from the hotbar (1)
  if (data.selectedItem === null) {
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

  // Selected item collision policy must allow placement (4)
  if (!resolvedPlacement.canPlace) {
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
