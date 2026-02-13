import { PlayerComponent } from "@/components/player";
import { createSystem, useWorld } from "@repo/engine";
import { PhysicsWorld, collides, resolve } from "@repo/physics";

const physicsWorld = new PhysicsWorld();

export const SceneCollisionSystem = createSystem("demo:spatial-contexts-collision")({
  phase: "update",
  priority: 100,
  system() {
    const world = useWorld();

    physicsWorld.build(world);

    const [playerId] = world.query(PlayerComponent);
    if (playerId === undefined) {
      return;
    }

    const playerBody = physicsWorld.getBody(playerId);
    if (!playerBody) return;

    const candidateBodies = physicsWorld.broadPhase(playerBody);

    for (const otherBody of candidateBodies) {
      if (
        collides(playerBody.collider, playerBody.transform, otherBody.collider, otherBody.transform)
      ) {
        resolve(playerBody.collider, playerBody.transform, otherBody.collider, otherBody.transform);
      }
    }
  },
});
