import { OrbitMotion } from "@/components/orbit-motion";
import { createSystem, useDelta, useWorld } from "@repo/engine";
import { LocalTransform2D } from "@repo/engine/components";

export const PlayerOrbitSystem = createSystem("main:player-orbit")({
  system() {
    const world = useWorld();
    const [updateDelta] = useDelta();
    const seconds = updateDelta / 1000;

    for (const entityId of world.query(OrbitMotion, LocalTransform2D)) {
      const orbit = world.get(entityId, OrbitMotion);
      const localTransform = world.get(entityId, LocalTransform2D);

      if (!orbit || !localTransform) {
        continue;
      }

      orbit.angleRadians += orbit.speedRadiansPerSecond * seconds;
      localTransform.curr.pos.x = Math.cos(orbit.angleRadians) * orbit.radius;
      localTransform.curr.pos.y = Math.sin(orbit.angleRadians) * orbit.radius;
    }
  },
});
