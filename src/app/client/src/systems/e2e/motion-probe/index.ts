import { createSystem } from "@engine";
import { Debug, Transform2D } from "@engine/components";
import { Delta, fromContext, World } from "@engine/context";

const PROBE_SPEED_UNITS_PER_SECOND = 90;
const PROBE_END_X = 90;

export const System = createSystem("e2e:motion-probe")({
  system() {
    const world = fromContext(World);
    const [updateDelta] = fromContext(Delta);
    const seconds = updateDelta / 1000;

    for (const entityId of world.query(Debug, Transform2D)) {
      const debug = world.get(entityId, Debug);
      if (!debug || debug.name !== "e2e-motion-probe") {
        continue;
      }

      world.patch(entityId, Transform2D, (transform) => {
        transform.curr.pos.x = Math.min(
          PROBE_END_X,
          transform.curr.pos.x + PROBE_SPEED_UNITS_PER_SECOND * seconds,
        );
      });
    }
  },
});
