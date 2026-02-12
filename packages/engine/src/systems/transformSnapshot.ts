import { Transform2D, Transform3D } from "../components/transform";
import { useWorld } from "../core/context";
import { createSystem } from "../core/register/system";

export const transformSnapshotSystem = createSystem("engine:transformSnapshot")({
  phase: "update",
  system: () => {
    const world = useWorld();

    // Snapshot Transform2D
    for (const entityId of world.query(Transform2D)) {
      const transform = world.get(entityId, Transform2D);
      if (transform) {
        transform.prev.copyFrom(transform.curr);
      }
    }

    // Snapshot Transform3D
    for (const entityId of world.query(Transform3D)) {
      const transform = world.get(entityId, Transform3D);
      if (transform) {
        transform.prev.copyFrom(transform.curr);
      }
    }
  },
});
