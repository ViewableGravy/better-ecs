import { PlayerComponent } from "@client/components/player";
import { createSystem } from "@engine";
import { fromContext, World } from "@engine/context";
import { PhysicsWorld, collides, resolve } from "@libs/physics";

const physicsWorld = new PhysicsWorld();

export const System = createSystem("main:spatial-contexts-collision")({
  system() {
    const world = fromContext(World);

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
