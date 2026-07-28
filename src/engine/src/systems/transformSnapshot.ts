import {
  Transform3D,
} from "@engine/components/transform";
import { ActiveRegistry, fromContext } from "@engine/context";
import { createSystem } from "@engine/core/system";
import { transform2DTracker } from "@engine/systems/transform2d-tracker";

export const transformSnapshotSystem = createSystem("engine:transformSnapshot")({
  system: () => {
    const registry = fromContext(ActiveRegistry);
    transform2DTracker.snapshot(registry);

    // Snapshot Transform3D
    registry.forEach(Transform3D, (_, transform) => {
      transform.prev.copyFrom(transform.curr);
    });
  },
});
