import { ensurePlayer } from "@client/entities/player";
import { setupContextPlayer } from "@client/scenes/world/contexts/shared";
import { System as BuildModeSystem } from "@client/systems/world/build-mode";
import { Placeable } from "@client/systems/world/build-mode/components";
import { DebugOverlaySystem } from "@client/systems/world/debug-overlay";
import type { UserWorld } from "@engine";
import { Transform2D } from "@engine/components";
import { contextId, createContextScene, defineContext } from "@libs/spatial-contexts";

const ROOT_CONTEXT_ID = contextId("default");
const PLAYER_START_X = 0;
const PLAYER_START_Y = 0;

type E2ESceneHarness = {
  world: UserWorld;
  placeableCount: () => number;
  focusedContextId: () => string;
  resetPlayer: () => void;
};

declare global {
  interface Window {
    __BETTER_ECS_E2E__?: E2ESceneHarness;
  }
}

export const Scene = createContextScene("E2EScene")({
  systems: [BuildModeSystem, DebugOverlaySystem],
  contexts: [
    defineContext({
      id: ROOT_CONTEXT_ID,
      policy: {
        visibility: "stack",
        simulation: "focused-only",
      },
      setup(world) {
        setupContextPlayer(world, PLAYER_START_X, PLAYER_START_Y);
      },
    }),
  ],
  setup(_world, manager) {
    manager.ensureWorldLoaded(ROOT_CONTEXT_ID);
    manager.setFocusedContextId(ROOT_CONTEXT_ID);

    const rootWorld = manager.requireWorld(ROOT_CONTEXT_ID);

    window.__BETTER_ECS_E2E__ = {
      world: rootWorld,
      placeableCount() {
        return countPlaceables(rootWorld);
      },
      focusedContextId() {
        return manager.focusedContextId;
      },
      resetPlayer() {
        const playerId = ensurePlayer(rootWorld);
        const playerTransform = rootWorld.get(playerId, Transform2D);
        if (playerTransform) {
          playerTransform.curr.pos.set(PLAYER_START_X, PLAYER_START_Y);
          playerTransform.prev.pos.set(PLAYER_START_X, PLAYER_START_Y);
        }
      },
    };
  },
});

function countPlaceables(world: UserWorld): number {
  return world.query(Placeable).length;
}

