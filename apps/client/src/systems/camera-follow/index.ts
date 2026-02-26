import { PlayerUtils } from "@/entities/player/utils";
import { createSystem } from "@repo/engine";
import { Camera, Transform2D } from "@repo/engine/components";
import { fromContext, Engine, World } from "@repo/engine/context";

export const System = createSystem("camera-follow")({
  system() {
    const sourceWorld = fromContext(World);
    const engine = fromContext(Engine);

    const sourceTransform = PlayerUtils.getTransform(sourceWorld);

    for (const world of engine.scene.context.worlds) {
      for (const cameraId of world.query(Camera, Transform2D)) {
        const cameraTransform = world.get(cameraId, Transform2D);
        if (!cameraTransform) {
          continue;
        }

        cameraTransform.curr.copyFrom(sourceTransform.curr);
        cameraTransform.prev.copyFrom(sourceTransform.prev);
      }
    }
  },
});
