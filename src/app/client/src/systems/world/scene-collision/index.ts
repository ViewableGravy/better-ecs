import { PlayerComponent } from "@client/components/player";
import { PhysicsWorldManager } from "@client/scenes/world/physics/physics-world-manager";
import { createSystem } from "@engine";
import { fromContext, World } from "@engine/context";
import { collides, COLLISION_LAYERS, resolve } from "@libs/physics";

export const System = createSystem("main:spatial-contexts-collision")({
  system() {
    const world = fromContext(World);
    const physicsWorld = PhysicsWorldManager.requireWorld(world);
    const playerBody = physicsWorld.queryFirstLayer(COLLISION_LAYERS.ACTOR, PlayerComponent);

    if (!playerBody) {
      return;
    }

    const candidateBodies = physicsWorld.collisionCandidates(playerBody);

    for (const otherBody of candidateBodies) {
      if (
        collides(playerBody.collider, playerBody.transform, otherBody.collider, otherBody.transform)
      ) {
        resolve(playerBody.collider, playerBody.transform, otherBody.collider, otherBody.transform);
      }
    }
  },
});
