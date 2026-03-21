import { OrbitMotion } from "@client/components/orbit-motion";
import { createSystem, mutate } from "@engine";
import { Parent, Transform2D } from "@engine/components";
import { Delta, fromContext, World } from "@engine/context";

export const PlayerOrbitSystem = createSystem("main:player-orbit")({
  system() {
    const world = fromContext(World);
    const [updateDelta] = fromContext(Delta);
    const seconds = updateDelta / 1000;

    for (const entityId of world.query(OrbitMotion, Parent, Transform2D)) {
      const orbit = world.get(entityId, OrbitMotion);
      const localTransform = world.get(entityId, Transform2D);

      if (!orbit || !localTransform) {
        continue;
      }

      orbit.angleRadians += orbit.speedRadiansPerSecond * seconds;
      mutate(localTransform, "curr", (curr) => {
        curr.pos.x = Math.cos(orbit.angleRadians) * orbit.radius;
        curr.pos.y = Math.sin(orbit.angleRadians) * orbit.radius;
      });
    }
  },
});
