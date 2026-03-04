import { createDomLoadingOverlay } from "@client/overlays/create-dom-loading-overlay";
import { sceneConfig } from "@client/scenes/world/const";
import { defineDungeonContext } from "@client/scenes/world/contexts/define-dungeon-context";
import { defineHouseContext } from "@client/scenes/world/contexts/define-house-context";
import { defineOverworldContext } from "@client/scenes/world/contexts/define-overworld-context";
import { System as BuildModeSystem } from "@client/systems/world/build-mode";
import { DebugOverlaySystem } from "@client/systems/world/debug-overlay";
import { HouseContextSystem } from "@client/systems/world/house-transition";
import { PlayerOrbitSystem } from "@client/systems/world/player-orbit";
import { System as PortalSystem } from "@client/systems/world/portal";
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
    PlayerOrbitSystem,
    HouseContextSystem, 
    PortalSystem, 
    BuildModeSystem, 
    DebugOverlaySystem
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
