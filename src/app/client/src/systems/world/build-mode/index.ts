import type { RenderVisibilityRole } from "@client/components/render-visibility";
import { HOUSE_INTERIOR, OUTSIDE } from "@client/components/render-visibility";
import { GhostPreviewComponent, GhostPreviewScopeUtils } from "@client/entities/ghost";
import { supportsLineDragPlacement } from "@client/systems/world/build-mode/build-items";
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
    const commitWorld = placementTarget.commitWorld;
    const resolvedPlacement = placementTarget.blocked || commitWorld === undefined
      ? null
      : Placement.resolveSelection(placementTarget, gridCoordinates, data);

    GhostPreviewScopeUtils.pruneGhosts(rootWorld, placementTarget.previewWorld, sceneWorlds);

    if (data.selectedItem === null || resolvedPlacement === null) {
      placementTarget.previewWorld.destroy(GhostPreviewComponent);
      data.ghostEntityId = null;
    } else {
      data.ghostEntityId = resolvedPlacement.preview.sync(data.ghostEntityId);
    }

    const shouldDelete = data.pendingDelete;
    const shouldPlaceSingle = data.pendingPlace;
    data.pendingDelete = false;
    data.pendingPlace = false;

    if (shouldDelete && !placementTarget.blocked && commitWorld) {
      Placement.deleteAt(commitWorld, worldPointer);
    }

    if (!commitWorld || placementTarget.blocked) {
      return;
    }

    const renderVisibilityRole = resolvePlacementRenderVisibilityRole(
      engine,
      placementTarget.commitContextId,
    );

    if (!supportsLineDragPlacement(data.selectedItem)) {
      if (shouldPlaceSingle) {
        spawnPlacementAtGridCoordinates(placementTarget, gridCoordinates, data, renderVisibilityRole);
      }

      return;
    }

    for (const candidateCoordinates of BuildModeDragPlacement.resolvePlacementCandidates(data, gridCoordinates)) {
      if (!spawnPlacementAtGridCoordinates(placementTarget, candidateCoordinates, data, renderVisibilityRole)) {
        break;
      }
    }
  },
});

function spawnPlacementAtGridCoordinates(
  placementTarget: ReturnType<typeof resolvePlacementWorld>,
  gridCoordinates: GridCoordinates,
  data: RegisteredSystems["main:build-mode"]["data"],
  renderVisibilityRole: RenderVisibilityRole,
): boolean {
  const resolvedPlacement = Placement.resolveSelection(placementTarget, gridCoordinates, data);

  if (resolvedPlacement === null || !resolvedPlacement.canPlace) {
    return false;
  }

  resolvedPlacement.commit.execute(renderVisibilityRole);
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
