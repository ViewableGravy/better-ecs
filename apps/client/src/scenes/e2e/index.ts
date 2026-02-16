import { ensurePlayer } from "@/entities/player";
import { setupContextPlayer } from "@/scenes/spatial-contexts-demo/contexts/shared";
import { System as BuildModeSystem } from "@/scenes/spatial-contexts-demo/systems/build-mode";
import {
  ColliderDebugProxy,
  GhostPreview,
  Placeable,
} from "@/scenes/spatial-contexts-demo/systems/build-mode/components";
import { DebugOverlaySystem } from "@/scenes/spatial-contexts-demo/systems/debug-overlay.system";
import type { UserWorld } from "@repo/engine";
import { Transform2D } from "@repo/engine/components";
import { contextId, createContextScene, defineContext } from "@repo/spatial-contexts";

const ROOT_CONTEXT_ID = contextId("default");
const PLAYER_START_X = 0;
const PLAYER_START_Y = 0;

type E2ESceneHarness = {
  reset: () => void;
  placeableCount: () => number;
  focusedContextId: () => string;
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

    const rootWorld = manager.getWorldOrThrow(ROOT_CONTEXT_ID);
    resetSceneState(rootWorld);

    window.__BETTER_ECS_E2E__ = {
      reset() {
        resetSceneState(rootWorld);
        manager.setFocusedContextId(ROOT_CONTEXT_ID);
      },
      placeableCount() {
        return countPlaceables(rootWorld);
      },
      focusedContextId() {
        return manager.focusedContextId;
      },
    };
  },
});

function resetSceneState(world: UserWorld): void {
  world.destroy(Placeable);
  world.destroy(GhostPreview);
  world.destroy(ColliderDebugProxy);

  const playerId = ensurePlayer(world);
  const playerTransform = world.get(playerId, Transform2D);
  if (!playerTransform) {
    return;
  }

  playerTransform.curr.pos.set(PLAYER_START_X, PLAYER_START_Y);
  playerTransform.prev.pos.set(PLAYER_START_X, PLAYER_START_Y);
}

function countPlaceables(world: UserWorld): number {
  return world.query(Placeable).length;
}
