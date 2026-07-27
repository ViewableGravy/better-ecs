import { PlayerComponent } from "@legacy/components/player";
import { PhysicsWorldManager } from "@legacy/scenes/world/physics/physics-world-manager";
import { createSystem } from "@engine";
import { Transform2D } from "@engine/components";
import { fromContext, ActiveRegistry } from "@engine/context";
import { collides, COLLISION_LAYERS, resolve } from "@libs/physics";

export const System = createSystem("main:scene-collision-authority")({
  system() {
    const world = fromContext(ActiveRegistry);
    const physicsWorld = PhysicsWorldManager.requireWorld(world);
    const playerBody = physicsWorld.queryFirstLayer(COLLISION_LAYERS.ACTOR, PlayerComponent);

    if (!playerBody) {
      return;
    }

    const candidateBodies = physicsWorld.collisionCandidates(playerBody);

    for (const otherBody of candidateBodies) {
      if (!collides(playerBody.collider, playerBody.transform, otherBody.collider, otherBody.transform)) {
        continue;
      }

      world.patch(playerBody.entityId, Transform2D, (playerTransform) => {
        world.patch(otherBody.entityId, Transform2D, (otherTransform) => {
          resolve(playerBody.collider, playerTransform, otherBody.collider, otherTransform);
        });
      });
    }
  },
});
