import { Debug } from "@engine/components/debug";
import { Transform2D } from "@engine/components/transform/transform2d";
import { createEngine } from "@engine/core/factory";
import { createScene } from "@engine/core/scene/scene";
import { AuthoritativeNetworkRuntime } from "@repo/networking";
import { NETWORK_DEMO_PLAYER_NAME, networkDemoCommandHandlers } from "@server/scenes/network-demo/commands";

export const NETWORK_DEMO_SCENE_NAME = "network-demo";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export function createNetworkDemoScene() {
  return createScene(NETWORK_DEMO_SCENE_NAME)({
    setup(world) {
      const player = world.create();
      world.add(player, new Debug(NETWORK_DEMO_PLAYER_NAME));
      world.add(player, new Transform2D(0, 0));
    },
  });
}

export async function createNetworkDemoEngine(): Promise<{
  engine: ReturnType<typeof createEngine>;
  runtime: AuthoritativeNetworkRuntime;
}> {
  const runtime = new AuthoritativeNetworkRuntime({
    commandHandlers: networkDemoCommandHandlers,
  });
  const scene = createNetworkDemoScene();
  const engine = createEngine({
    systems: [],
    scenes: [scene],
    initialScene: NETWORK_DEMO_SCENE_NAME,
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