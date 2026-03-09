import { createDomLoadingOverlay } from "@client/overlays/create-dom-loading-overlay";
import { FPSSystem } from "@client/plugins/fps";
import { PhysicsDebugSystem } from "@client/plugins/physics";
import { sceneConfig } from "@client/scenes/world/const";
import { defineDungeonContext } from "@client/scenes/world/contexts/define-dungeon-context";
import { defineHouseContext } from "@client/scenes/world/contexts/define-house-context";
import { defineOverworldContext } from "@client/scenes/world/contexts/define-overworld-context";
import { System as CameraFollow } from "@client/systems/core/camera-follow";
import { System as CameraZoom } from "@client/systems/core/camera-zoom";
import { System as Movement } from "@client/systems/core/movement";
import { System as PhysicsWorldSync } from "@client/systems/core/physics-world-sync";
import { System as TempAutoSavePlayerPosition } from "@client/systems/core/temp-auto-save";
import { System as BuildModeSystem } from "@client/systems/world/build-mode";
import { System as ConveyorEntityMotion } from "@client/systems/world/conveyor-entity-motion";
import { System as ConveyorMovement } from "@client/systems/world/conveyor-movement";
import { DebugOverlaySystem } from "@client/systems/world/debug-overlay";
import { HouseContextSystem } from "@client/systems/world/house-transition";
import { PlayerOrbitSystem } from "@client/systems/world/player-orbit";
import { System as PortalSystem } from "@client/systems/world/portal";
import { System as Collision } from "@client/systems/world/scene-collision";
import { fromContext, FromEngine } from "@engine/context";
import {
  createContextScene
} from "@libs/spatial-contexts";

export const Scene = createContextScene("MainScene")({
  loading: createDomLoadingOverlay({
    id: "scene-loading-overlay-main",
    message: "Loading Main Scene...",
    zIndex: 10001,
    scope: "canvas-parent",
  }),
  systems: [
    FPSSystem,
    TempAutoSavePlayerPosition,
    Movement,
    PhysicsWorldSync,
    ConveyorEntityMotion,
    ConveyorMovement,
    Collision,
    CameraFollow,
    CameraZoom,
    PhysicsDebugSystem,
    PlayerOrbitSystem,
    HouseContextSystem,
    PortalSystem,
    BuildModeSystem,
    DebugOverlaySystem,
  ],
  contexts: [
    defineOverworldContext({
      overworldId: sceneConfig.contextIds.overworld,
      houseId: sceneConfig.contextIds.house,
      dungeonId: sceneConfig.contextIds.dungeon,
      houseHalfWidth: sceneConfig.house.halfWidth,
      houseHalfHeight: sceneConfig.house.halfHeight,
    }),
    defineHouseContext({
      overworldId: sceneConfig.contextIds.overworld,
      houseId: sceneConfig.contextIds.house,
      dungeonId: sceneConfig.contextIds.dungeon,
      houseHalfWidth: sceneConfig.house.halfWidth,
      houseHalfHeight: sceneConfig.house.halfHeight,
    }),
    defineDungeonContext({
      overworldId: sceneConfig.contextIds.overworld,
      dungeonId: sceneConfig.contextIds.dungeon,
    }),
  ],
  async setup(_world, manager) {
    manager.ensureWorldLoaded(sceneConfig.contextIds.house);
    manager.ensureWorldLoaded(sceneConfig.contextIds.dungeon);
    manager.setFocusedContextId(sceneConfig.contextIds.overworld);

    const assets = fromContext(FromEngine.Assets);

    await new Promise((resolve) => setTimeout(resolve, 500)); // artificial delay to show loading overlay

    await assets.load("player-sprite");
    await assets.loadSheet("iron-gear");
    await assets.loadSheet("transport-belt");
  },
});
