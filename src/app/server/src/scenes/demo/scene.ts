import { createEngine } from "@engine";
import { contextId, createContextScene, defineContext } from "@libs/spatial-contexts";
import { AuthoritativeNetworkRuntime } from "@repo/networking";
import { demoCommandHandlers } from "@server/scenes/demo/commands";
import { spawnPlayer } from "@server/scenes/demo/entities/player/spawnPlayer";
import { System as MovementAuthority } from "@server/scenes/demo/systems/movement-authority";
import { System as MovementCommand } from "@server/scenes/demo/systems/movement-command";
import { System as MovementCommandReset } from "@server/scenes/demo/systems/movement-command-reset";

const DEFAULT_CONTEXT_ID = contextId("default");

export const AUTHORITATIVE_DEMO_SCENE_NAME = "AuthoritativeNetworkingScene";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export function createAuthoritativeDemoScene() {
  return createContextScene(AUTHORITATIVE_DEMO_SCENE_NAME)({
    systems: [
      MovementCommand,
      MovementAuthority,
      MovementCommandReset,
    ],
    contexts: [
      defineContext({
        id: DEFAULT_CONTEXT_ID,
        policy: {
          visibility: "stack",
          simulation: "focused-only",
        },
        setup(world) {
          spawnPlayer(world);
        },
      }),
    ],
    setup(_world, manager) {
      manager.setFocusedContextId(DEFAULT_CONTEXT_ID);
    },
  });
}

export async function createAuthoritativeDemoEngine(): Promise<{
  engine: ReturnType<typeof createEngine>;
  runtime: AuthoritativeNetworkRuntime;
}> {
  const runtime = new AuthoritativeNetworkRuntime({
    commandHandlers: demoCommandHandlers,
  });
  const scene = createAuthoritativeDemoScene();
  const engine = createEngine({
    systems: [],
    scenes: [scene],
    initialScene: AUTHORITATIVE_DEMO_SCENE_NAME,
    config: {
      serialization: {
        enableDirtyQueue: true,
      },
    },
  });

  runtime.attachEngine(engine);
  await engine.initialize();
  engine.serialization.drainDiffCommands();

  return {
    engine,
    runtime,
  };
}