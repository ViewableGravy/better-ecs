import { PlayerComponent } from "@/components/player";
import { createSystem, useWorld } from "@repo/engine";
import { Transform2D } from "@repo/engine/components";
import z from "zod";
import { CircleCollider } from "../components/circle-collider";

export const SceneCollisionSystem = createSystem("demo:spatial-contexts-collision")({
  phase: "update",
  priority: 100,
  schema: {
    default: {},
    schema: z.object({}),
  },
  system() {
    const world = useWorld();

    const [playerId] = world.query(PlayerComponent);
    if (!playerId) return;

    const playerTransform = world.get(playerId, Transform2D);
    const playerCollider = world.get(playerId, CircleCollider);
    if (!playerTransform || !playerCollider) return;

    for (const colliderId of world.query(CircleCollider, Transform2D)) {
      if (colliderId === playerId) continue;

      const collider = world.get(colliderId, CircleCollider);
      const colliderTransform = world.get(colliderId, Transform2D);
      if (!collider || !colliderTransform) continue;

      const dx = playerTransform.curr.pos.x - colliderTransform.curr.pos.x;
      const dy = playerTransform.curr.pos.y - colliderTransform.curr.pos.y;
      const minDistance = playerCollider.radius + collider.radius;
      const distanceSq = dx * dx + dy * dy;

      if (distanceSq >= minDistance * minDistance) continue;

      const distance = Math.sqrt(distanceSq);
      if (distance === 0) {
        playerTransform.curr.pos.x += minDistance;
        continue;
      }

      const nx = dx / distance;
      const ny = dy / distance;
      const overlap = minDistance - distance;

      playerTransform.curr.pos.x += nx * overlap;
      playerTransform.curr.pos.y += ny * overlap;
    }
  },
});
