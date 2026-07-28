import { PlayerComponent } from "@client/components/player";
import { PhysicsWorldManager } from "@client/physics/physics-world-manager";
import { createSystem } from "@engine";
import { Transform2D } from "@engine/components";
import { ActiveRegistry, fromContext } from "@engine/context";
import { COLLISION_LAYERS, collides, resolve } from "@libs/physics";

export const PlayerCollision = createSystem("main:player-collision")({
  system() {
    const world = fromContext(ActiveRegistry);
    const physicsWorld = PhysicsWorldManager.requireWorld(world);
    const playerBody = physicsWorld.queryFirstLayer(COLLISION_LAYERS.ACTOR, PlayerComponent);

    if (!playerBody) {
      return;
    }

    for (const otherBody of physicsWorld.collisionCandidates(playerBody)) {
      if (!collides(playerBody.collider, playerBody.transform, otherBody.collider, otherBody.transform)) {
        continue;
      }

      world.patch(playerBody.entityId, Transform2D, (playerTransform) => {
        world.patch(otherBody.entityId, Transform2D, (otherTransform) =>
          resolve(playerBody.collider, playerTransform, otherBody.collider, otherTransform),
        );
      });
    }
  },
});
