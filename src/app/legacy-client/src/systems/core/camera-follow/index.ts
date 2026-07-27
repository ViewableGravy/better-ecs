import { PlayerUtils } from "@legacy/entities/player/utils";
import { createSystem } from "@engine";
import { Camera, Transform2D } from "@engine/components";
import { fromContext, ActiveRegistry } from "@engine/context";

export const System = createSystem("camera-follow")({
  system() {
    const registry = fromContext(ActiveRegistry);
    const sourceTransform = PlayerUtils.getTransform(registry);

    for (const cameraId of registry.query(Camera, Transform2D)) {
      registry.patch(cameraId, Transform2D, (cameraTransform) => {
        cameraTransform.curr.copyFrom(sourceTransform.curr);
        cameraTransform.prev.copyFrom(sourceTransform.prev);
      });
    }
  },
});
