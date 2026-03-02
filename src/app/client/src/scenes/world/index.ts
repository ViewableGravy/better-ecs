import { sceneConfig } from "@client/scenes/world/const";
import { System as BuildModeSystem } from "@client/scenes/world/systems/build-mode";
import { fromContext, FromEngine } from "@engine/context";
import {
  createContextScene
} from "@libs/spatial-contexts";
import { defineDungeonContext } from "@client/scenes/world/contexts/define-dungeon-context";
import { defineHouseContext } from "@client/scenes/world/contexts/define-house-context";
import { defineOverworldContext } from "@client/scenes/world/contexts/define-overworld-context";
import { getAllTransportBeltAssetIds } from "@client/scenes/world/factories/spawnTransportBelt";
import { DebugOverlaySystem } from "@client/scenes/world/systems/debug-overlay.system";
import { HouseContextSystem } from "@client/scenes/world/systems/houseTransition/house-context.system";
import { PlayerOrbitSystem } from "@client/scenes/world/systems/player-orbit.system";
import { System as PortalSystem } from "@client/scenes/world/systems/portal";

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

    await fromContext(FromEngine.Assets).loadMany(getAllTransportBeltAssetIds())
  },
});
