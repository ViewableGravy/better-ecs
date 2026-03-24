import { Transform2D, Transform3D, WorldTransform2D } from "@engine/components/transform";
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

    // Cached world transforms are derived during scene systems, so they still need
    // their interpolation history advanced even when no local transform is dirty.
    for (const entityId of world.query(WorldTransform2D)) {
      const transform = world.get(entityId, WorldTransform2D);
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
