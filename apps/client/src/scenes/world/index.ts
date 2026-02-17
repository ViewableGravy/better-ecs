import { sceneConfig } from "@/scenes/world/const";
import { System as BuildModeSystem } from "@/scenes/world/systems/build-mode";
import {
  createContextScene
} from "@repo/spatial-contexts";
import { defineDungeonContext } from "./contexts/define-dungeon-context";
import { defineHouseContext } from "./contexts/define-house-context";
import { defineOverworldContext } from "./contexts/define-overworld-context";
import { DebugOverlaySystem } from "./systems/debug-overlay.system";
import { HouseContextSystem } from "./systems/house-context.system";
import { System as PortalSystem } from "./systems/portal";

export const Scene = createContextScene("MainScene")({
  systems: [
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
  setup(_world, manager) {
    manager.ensureWorldLoaded(sceneConfig.contextIds.house);
    manager.ensureWorldLoaded(sceneConfig.contextIds.dungeon);
    manager.setFocusedContextId(sceneConfig.contextIds.overworld);
  },
});
