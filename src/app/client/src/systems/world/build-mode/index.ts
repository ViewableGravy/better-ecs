import type { RenderVisibilityRole } from "@client/components/render-visibility";
import { HOUSE_INTERIOR, OUTSIDE } from "@client/components/render-visibility";
import { spawnBox } from "@client/entities/box";
import { BoxGhost } from "@client/entities/box/ghost";
import { GhostPreviewComponent } from "@client/entities/ghost";
import { spawnTransportBelt } from "@client/entities/transport-belt";
import { TransportBeltGhost } from "@client/entities/transport-belt/ghost";
import { TransportBeltAutoShapeManager } from "@client/entities/transport-belt/placement/TransportBeltAutoShapeManager";
import { TransportBeltPlacementRotationManager } from "@client/entities/transport-belt/placement/TransportBeltPlacementRotationManager";
import { Placeable } from "@client/systems/world/build-mode/components";
import {
  buildModeStateDefault,
  buildModeStateSchema,
  TRANSPORT_BELT_OFFSET_X,
  TRANSPORT_BELT_OFFSET_Y,
} from "@client/systems/world/build-mode/const";
import { BuildModeDomEvents, HUD } from "@client/systems/world/build-mode/dom";
import { GhostPreviewManager } from "@client/systems/world/build-mode/ghost-preview-manager";
import { GhostPreviewScopeUtils } from "@client/systems/world/build-mode/ghost-preview-scope";
import { GridSingleton, type GridCoordinates } from "@client/systems/world/build-mode/grid-singleton";
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
    const [snappedX, snappedY] = GridSingleton.gridCoordinatesToWorldOrigin(gridCoordinates);

    const placementTarget = resolvePlacementWorld(engine, worldPointer);
    const placementWorld = placementTarget.world;
    const selectedTransportBeltVariant = data.selectedItem === "transport-belt" && placementWorld
      ? TransportBeltPlacementRotationManager.resolveVariant(
        placementWorld,
        gridCoordinates,
        data.placementEndSide,
      )
      : null;

    GhostPreviewScopeUtils.pruneGhosts(rootWorld, focusedWorld, sceneWorlds);

    if (data.selectedItem === null || placementTarget.blocked) {
      focusedWorld.destroy(GhostPreviewComponent);
      data.ghostEntityId = null;
    } else {
      if (data.selectedItem === "transport-belt" && selectedTransportBeltVariant !== null) {
        data.ghostEntityId = GhostPreviewManager.sync(
          focusedWorld,
          data.ghostEntityId,
          snappedX,
          snappedY,
          TransportBeltGhost as any,
          selectedTransportBeltVariant,
        );
      } else {
        data.ghostEntityId = GhostPreviewManager.sync(
          focusedWorld,
          data.ghostEntityId,
          snappedX,
          snappedY,
          BoxGhost,
        );
      }
    }

    const shouldDelete = data.pendingDelete;
    const shouldPlace = data.pendingPlace;
    data.pendingDelete = false;
    data.pendingPlace = false;

    if (shouldDelete && !placementTarget.blocked && placementWorld) {
      Placement.deleteAt(placementWorld, worldPointer);
    }

    if (placementTarget.world) {
      if (shouldSpawnPlacement(shouldPlace, placementTarget, data, gridCoordinates)) {
        const renderVisibilityRole = resolvePlacementRenderVisibilityRole(
          engine,
          placementTarget.contextId,
        );

        if (data.selectedItem === "box") {
          spawnBox(placementTarget.world, {
            snappedX,
            snappedY,
            renderVisibilityRole,
          });
        }

        if (data.selectedItem === "transport-belt" && selectedTransportBeltVariant !== null) {
          const beltX = snappedX + TRANSPORT_BELT_OFFSET_X;
          const beltY = snappedY + TRANSPORT_BELT_OFFSET_Y;

          Placement.replaceTransportBeltAt(placementTarget.world, beltX, beltY);

          const beltEntityId = spawnTransportBelt(placementTarget.world, {
            x: beltX,
            y: beltY,
            variant: selectedTransportBeltVariant,
          });

          TransportBeltAutoShapeManager.refreshAffectedBelts(placementTarget.world, beltEntityId);

          placementTarget.world.add(
            beltEntityId,
            new Placeable("transport-belt"),
          );
        }
      }
    }
  },
});

function shouldSpawnPlacement(
  shouldPlace: boolean,
  placementTarget: PlacementWorldResolution,
  data: RegisteredSystems["main:build-mode"]["data"],
  gridCoordinates: GridCoordinates,
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
  if (!Placement.canPlaceItem(placementTarget.world, gridCoordinates, data.selectedItem)) {
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
