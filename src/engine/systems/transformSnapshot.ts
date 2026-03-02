import { Transform2D, Transform3D } from "@engine/components/transform";
import { fromContext, World } from "@engine/context";
import { createSystem } from "@engine/core/system";

export const transformSnapshotSystem = createSystem("engine:transformSnapshot")({
  system: () => {
    const world = fromContext(World);

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
