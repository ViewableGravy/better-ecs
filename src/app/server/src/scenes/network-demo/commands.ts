import { Debug } from "@engine/components/debug";
import { Transform2D } from "@engine/components/transform/transform2d";
import type { SceneContext } from "@engine/core/scene/scene-context";
import type { EntityId } from "@engine/ecs/entity";
import { mutate } from "@engine/serialization";
import type { AuthoritativeCommandHandlers } from "@repo/networking";
import invariant from "tiny-invariant";

export const NETWORK_DEMO_MOVE_COMMAND = "network-demo:move-player";
export const NETWORK_DEMO_PLAYER_NAME = "network-demo-player";

type MoveDemoPlayerPayload = {
  dx: number;
  dy: number;
};

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export const networkDemoCommandHandlers: AuthoritativeCommandHandlers = {
  [NETWORK_DEMO_MOVE_COMMAND]: ({ payload, scene }) => {
    assertMovePayload(payload);

    if (payload.dx === 0 && payload.dy === 0) {
      return;
    }

    const transform = requireDemoPlayerTransform(scene);
    mutate(transform, "curr", (current) => {
      current.pos.x += payload.dx;
      current.pos.y += payload.dy;
    });
  },
};

export function requireDemoPlayerTransform(scene: SceneContext): Transform2D {
  const playerId = findDemoPlayerEntityId(scene);
  return scene.getDefaultWorld().require(playerId, Transform2D);
}

function findDemoPlayerEntityId(scene: SceneContext): EntityId {
  let playerId: EntityId | null = null;
  const world = scene.getDefaultWorld();

  world.forEach(Debug, (entityId, debug) => {
    if (debug.name === NETWORK_DEMO_PLAYER_NAME) {
      playerId = entityId;
    }
  });

  invariant(playerId !== null, `Expected to find the ${NETWORK_DEMO_PLAYER_NAME} entity.`);
  return playerId;
}

function assertMovePayload(payload: unknown): asserts payload is MoveDemoPlayerPayload {
  if (typeof payload !== "object" || payload === null) {
    throw new Error("Move payload must be an object with numeric dx and dy fields.");
  }

  const candidate = payload as {
    dx?: unknown;
    dy?: unknown;
  };

  if (typeof candidate.dx !== "number" || typeof candidate.dy !== "number") {
    throw new Error("Move payload must contain numeric dx and dy fields.");
  }
}