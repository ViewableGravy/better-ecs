import {
  Transform2D,
  Transform3D,
  type TransformState2D,
  WorldTransform2D,
} from "@engine/components/transform";
import { fromContext, World } from "@engine/context";
import { createSystem } from "@engine/core/system";

export const transformSnapshotSystem = createSystem("engine:transformSnapshot")({
  system: () => {
    const world = fromContext(World);

    // Snapshot Transform2D
    world.forEach(Transform2D, (_, transform) => {
      transform.prev.copyFrom(transform.curr);
    });

    // Cached world transforms are derived during scene systems, so they still need
    // their interpolation history advanced even when no local transform is dirty.
    world.forEach(WorldTransform2D, (entityId, transform) => {
      if (transformStatesMatch(transform.prev, transform.curr)) {
        return;
      }

      transform.prev.copyFrom(transform.curr);
      world.notifyEntityChanged(entityId);
    });

    // Snapshot Transform3D
    world.forEach(Transform3D, (_, transform) => {
      transform.prev.copyFrom(transform.curr);
    });
  },
});

function transformStatesMatch(left: TransformState2D, right: TransformState2D): boolean {
  return left.pos.x === right.pos.x
    && left.pos.y === right.pos.y
    && left.rotation === right.rotation
    && left.scale.x === right.scale.x
    && left.scale.y === right.scale.y;
}
