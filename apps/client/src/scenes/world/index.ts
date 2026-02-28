import { sceneConfig } from "@/scenes/world/const";
import { System as BuildModeSystem } from "@/scenes/world/systems/build-mode";
import { fromContext, FromEngine } from "@repo/engine/context";
import {
  createContextScene
} from "@repo/spatial-contexts";
import { defineDungeonContext } from "./contexts/define-dungeon-context";
import { defineHouseContext } from "./contexts/define-house-context";
import { defineOverworldContext } from "./contexts/define-overworld-context";
import { DebugOverlaySystem } from "./systems/debug-overlay.system";
import { HouseContextSystem } from "./systems/houseTransition/house-context.system";
import { PlayerOrbitSystem } from "./systems/player-orbit.system";
import { System as PortalSystem } from "./systems/portal";

export const Scene = createContextScene("MainScene")({
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

    await fromContext(FromEngine.Assets).loadMany([
      "transport-belt:horizontal-right_1",
      "transport-belt:horizontal-right_2",
      "transport-belt:horizontal-right_3",
      "transport-belt:horizontal-right_4",
      "transport-belt:horizontal-right_5",
      "transport-belt:horizontal-right_6",
      "transport-belt:horizontal-right_7",
      "transport-belt:horizontal-right_8",
      "transport-belt:horizontal-right_9",
      "transport-belt:horizontal-right_10",
      "transport-belt:horizontal-right_11",
      "transport-belt:horizontal-right_12",
      "transport-belt:horizontal-right_13",
      "transport-belt:horizontal-right_14",
      "transport-belt:horizontal-right_15",
      "transport-belt:horizontal-right_16",
    ])
  },
});
