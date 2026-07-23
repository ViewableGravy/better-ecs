import {
  Transform3D,
} from "@engine/components/transform";
import { fromContext, Scene } from "@engine/context";
import { createSystem } from "@engine/core/system";
import { transform2DTracker } from "@engine/systems/transform2d-tracker";

export const transformSnapshotSystem = createSystem("engine:transformSnapshot")({
  system: () => {
    const scene = fromContext(Scene);
    for (const world of scene.worlds) {
      transform2DTracker.snapshot(world);
    }

    // Snapshot Transform3D
    for (const world of scene.worlds) {
      world.forEach(Transform3D, (_, transform) => {
        transform.prev.copyFrom(transform.curr);
      });
    }
  },
});
