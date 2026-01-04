import z from "zod";
import { Transform } from "../components/transform";
import { useWorld } from "../core/context";
import { createSystem } from "../core/register/system";

export const transformSnapshotSystem = createSystem("engine:transformSnapshot")({
  phase: "update",
  schema: {
    default: {},
    schema: z.object({}),
  },
  system: () => {
    const world = useWorld();
    for (const entityId of world.query(Transform)) {
      const transform = world.get(entityId, Transform);
      if (transform) {
        transform.prev.x = transform.curr.x;
        transform.prev.y = transform.curr.y;
        transform.prev.z = transform.curr.z;
      }
    }
  },
});
