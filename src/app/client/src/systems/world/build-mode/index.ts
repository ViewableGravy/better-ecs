import type { RenderVisibilityRole } from "@client/components/render-visibility";
import { HOUSE_INTERIOR, OUTSIDE } from "@client/components/render-visibility";
import { GhostPreviewComponent, GhostPreviewScopeUtils } from "@client/entities/ghost";
import {
  buildModeStateDefault,
  buildModeStateSchema,
} from "@client/systems/world/build-mode/const";
import { BuildModeDomEvents, HUD } from "@client/systems/world/build-mode/dom";
import { BuildModeDragPlacement } from "@client/systems/world/build-mode/drag-placement";
import {
  GridSingleton,
  type GridCoordinates,
} from "@client/systems/world/build-mode/grid-singleton";
import * as Keybinds from '@client/systems/world/build-mode/input';
import { Placement } from "@client/systems/world/build-mode/placement";
import { resolvePlacementWorld } from "@client/systems/world/build-mode/placement-target";
import {
  createSystem,
  type RegisteredEngine,
  type RegisteredSystems,
  type UserWorld,
} from "@engine";
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
    BuildModeDragPlacement.syncSession(data);
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
    const shouldPlaceSingle = data.pendingPlace;
    data.pendingDelete = false;
    data.pendingPlace = false;

    if (shouldDelete && !placementTarget.blocked && placementWorld) {
      Placement.deleteAt(placementWorld, worldPointer);
    }

    if (!placementTarget.world || placementTarget.blocked) {
      return;
    }

    const renderVisibilityRole = resolvePlacementRenderVisibilityRole(
      engine,
      placementTarget.contextId,
    );

    if (data.selectedItem !== "transport-belt") {
      if (shouldPlaceSingle) {
        spawnPlacementAtGridCoordinates(placementTarget.world, gridCoordinates, data, renderVisibilityRole);
      }

      return;
    }

    for (const candidateCoordinates of BuildModeDragPlacement.resolvePlacementCandidates(data, gridCoordinates)) {
      if (!spawnPlacementAtGridCoordinates(placementTarget.world, candidateCoordinates, data, renderVisibilityRole)) {
        break;
      }
    }
  },
});

function spawnPlacementAtGridCoordinates(
  placementWorld: UserWorld,
  gridCoordinates: GridCoordinates,
  data: RegisteredSystems["main:build-mode"]["data"],
  renderVisibilityRole: RenderVisibilityRole,
): boolean {
  const resolvedPlacement = Placement.resolveSelection(placementWorld, gridCoordinates, data);

  if (resolvedPlacement === null || !resolvedPlacement.canPlace) {
    return false;
  }

  resolvedPlacement.spawn(renderVisibilityRole);
  BuildModeDragPlacement.recordPlacement(data, gridCoordinates);

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
