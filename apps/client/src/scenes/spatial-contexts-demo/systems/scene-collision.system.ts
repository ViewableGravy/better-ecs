import { PlayerComponent } from "@/components/player";
import { createSystem, useWorld } from "@repo/engine";
import * as Collision from "../collisions/collision";
import { PhysicsWorld } from "../collisions/physics-world";

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
        Collision.collides(
          playerBody.collider,
          playerBody.transform,
          otherBody.collider,
          otherBody.transform,
        )
      ) {
        Collision.resolve(
          playerBody.collider,
          playerBody.transform,
          otherBody.collider,
          otherBody.transform,
        );
      }
    }
  },
});
