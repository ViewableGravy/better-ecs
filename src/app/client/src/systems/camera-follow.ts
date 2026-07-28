import { PlayerComponent } from "@client/components/player";
import { createSystem } from "@engine";
import { Camera, Transform2D } from "@engine/components";
import { ActiveRegistry, fromContext } from "@engine/context";

export const CameraFollow = createSystem("main:camera-follow")({
  system() {
    const world = fromContext(ActiveRegistry);
    const [playerId] = world.invariantQuery(PlayerComponent, Transform2D);
    const playerTransform = world.require(playerId, Transform2D);

    for (const cameraId of world.query(Camera, Transform2D)) {
      world.patch(cameraId, Transform2D, (cameraTransform) => {
        cameraTransform.curr.copyFrom(playerTransform.curr);
        cameraTransform.prev.copyFrom(playerTransform.prev);
      });
    }
  },
});
