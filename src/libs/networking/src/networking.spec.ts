import { Debug } from "@engine/components/debug";
import { Transform2D } from "@engine/components/transform/transform2d";
import { EngineSerializationManager } from "@engine/core/engine-serialization";
import type { RegisteredEngine } from "@engine/core/engine-types";
import { registerEngine, unregisterEngine } from "@engine/core/global-engine";
import type { SceneContext as SceneContextType } from "@engine/core/scene/scene-context";
import { SceneContext } from "@engine/core/scene/scene-context";
import { World } from "@engine/ecs/world";
import { mutate } from "@engine/serialization";
import {
    createCommandMessage,
    parseClientMessage,
    parseServerMessage,
    serializeNetworkMessage,
} from "@repo/networking/protocol";
import {
    AuthoritativeNetworkRuntime,
    type AuthoritativeCommandHandler,
} from "@repo/networking/server/AuthoritativeNetworkRuntime";
import invariant from "tiny-invariant";

const SCENE_NAME = "networking-test-scene";
const PLAYER_NAME = "networking-test-player";
const MOVE_COMMAND = "networking:move-player";

describe("networking protocol", () => {
  it("should accept literal ping messages", () => {
    const parsed = parseClientMessage("ping");

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }

    expect(parsed.value.type).toBe("ping");
  });

  it("should round-trip snapshot messages", () => {
    const message = {
      type: "snapshot",
      version: 4,
      scene: {
        sceneName: SCENE_NAME,
        worlds: [],
      },
    } as const;

    const parsed = parseServerMessage(serializeNetworkMessage(message));

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }

    expect(parsed.value).toEqual(message);
  });
});

describe("authoritative server runtime", () => {
  it("should snapshot on connect and emit diff batches after commands", async () => {
    const movePlayer: AuthoritativeCommandHandler<{ dx: number; dy: number }> = ({ scene, payload }) => {
      const transform = requirePlayerTransform(scene);

      mutate(transform, "curr", (current) => {
        current.pos.x += payload.dx;
        current.pos.y += payload.dy;
      });
    };

    const runtime = new AuthoritativeNetworkRuntime({
      commandHandlers: {
        [MOVE_COMMAND]: movePlayer,
      },
    });
    const { engine, scene, cleanup } = createMockEngine(SCENE_NAME);

    try {
      const player = scene.getDefaultWorld().create();
      scene.getDefaultWorld().add(player, new Debug(PLAYER_NAME));
      scene.getDefaultWorld().add(player, new Transform2D(0, 0));
      engine.serialization.drainDiffCommands();

      runtime.attachEngine(engine);
      runtime.connectClient("client-1");

      const initialDeliveries = runtime.flushOutgoingMessages();
      expect(initialDeliveries).toHaveLength(1);
      expect(initialDeliveries[0]).toMatchObject({
        type: "client",
        clientId: "client-1",
        message: {
          type: "snapshot",
        },
      });

      await runtime.receiveClientMessage(
        "client-1",
        serializeNetworkMessage(createCommandMessage(MOVE_COMMAND, { dx: 6, dy: -2 }, "command-1")),
      );

      const ackDeliveries = runtime.flushOutgoingMessages();
      expect(ackDeliveries).toEqual([
        {
          type: "client",
          clientId: "client-1",
          message: {
            type: "ack",
            commandId: "command-1",
            version: engine.serialization.currentVersion,
          },
        },
      ]);

      runtime.publishDiffCommands(engine.serialization.drainDiffCommands());

      const diffDeliveries = runtime.flushOutgoingMessages();
      expect(diffDeliveries).toHaveLength(1);
      expect(diffDeliveries[0].type).toBe("broadcast");
      expect(diffDeliveries[0].message.type).toBe("diff");
      expect(diffDeliveries[0].message.commands).toHaveLength(1);
      expect(diffDeliveries[0].message.commands[0]).toMatchObject({
        op: "set-field",
        componentType: "Transform2D",
        changes: {
          curr: {
            pos: {
              x: 6,
              y: -2,
            },
          },
        },
      });
    } finally {
      cleanup();
    }
  });
});

function createMockEngine(sceneName: string): {
  engine: RegisteredEngine;
  scene: SceneContext;
  cleanup: () => void;
} {
  unregisterEngine();

  const defaultWorld = new World(sceneName);
  const scene = new SceneContext(sceneName, defaultWorld);
  const engine = {
    systems: {},
    scene: {
      context: scene,
      activeSceneName: sceneName,
    },
  } as RegisteredEngine;
  const serialization = new EngineSerializationManager(engine, {
    enableDirtyQueue: true,
  });

  Object.assign(engine, {
    serialization,
  });

  registerEngine(engine);

  return {
    engine,
    scene,
    cleanup: () => {
      unregisterEngine();
    },
  };
}

function requirePlayerTransform(scene: SceneContextType): Transform2D {
  let playerId: number | null = null;
  const world = scene.getDefaultWorld();

  world.forEach(Debug, (entityId, debug) => {
    if (debug.name === PLAYER_NAME) {
      playerId = entityId;
    }
  });

  invariant(playerId !== null, `Expected to find player "${PLAYER_NAME}" in the scene.`);
  return world.require(playerId, Transform2D);
}