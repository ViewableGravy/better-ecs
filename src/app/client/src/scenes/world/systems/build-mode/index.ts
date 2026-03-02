import type { RenderVisibilityRole } from "@client/scenes/world/components/render-visibility";
import { HOUSE_INTERIOR, OUTSIDE } from "@client/scenes/world/components/render-visibility";
import { spawnBox } from "@client/scenes/world/factories/spawnBox";
import { spawnTransportBelt } from "@client/scenes/world/factories/spawnTransportBelt";
import { createSystem, type RegisteredEngine, type RegisteredSystems } from "@engine";
import { System as ContextSystem, Engine, fromContext, Mouse } from "@engine/context";
import { ActiveCameraView } from "@engine/context-utils";
import { SpatialContexts, type ContextId } from "@libs/spatial-contexts";
import { GhostPreview, Placeable } from "@client/scenes/world/systems/build-mode/components";
import {
  buildModeStateDefault,
  buildModeStateSchema,
  TRANSPORT_BELT_OFFSET_X,
  TRANSPORT_BELT_OFFSET_Y,
} from "@client/scenes/world/systems/build-mode/const";
import { BuildModeDomEvents, HUD } from "@client/scenes/world/systems/build-mode/dom";
import * as Keybinds from '@client/scenes/world/systems/build-mode/input';
import { Placement } from "@client/scenes/world/systems/build-mode/placement";
import { resolvePlacementWorld, type PlacementWorldResolution } from "@client/scenes/world/systems/build-mode/placement-target";

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

    const manager = SpatialContexts.requireManager(engine.scene.context);
    const focusedWorld = manager.focusedWorld;
    const sceneWorlds = engine.scene.context.worlds;

    Keybinds.matchKeybinds();
    HUD.update();

    const camera = fromContext(ActiveCameraView(focusedWorld));
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
      if (shouldSpawnPlacement(shouldPlace, placementTarget, data, snappedX, snappedY)) {
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

        if (data.selectedItem === "transport-belt-horizontal-right") {
          const beltX = snappedX + TRANSPORT_BELT_OFFSET_X;
          const beltY = snappedY + TRANSPORT_BELT_OFFSET_Y;

          Placement.replaceTransportBeltAt(placementTarget.world, beltX, beltY);

          const beltEntityId = spawnTransportBelt(placementTarget.world, {
            x: beltX,
            y: beltY,
            variant: "horizontal-right",
          });

          placementTarget.world.add(
            beltEntityId,
            new Placeable("transport-belt-horizontal-right"),
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
  snappedX: number,
  snappedY: number,
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
