import { PlayerComponent } from "@client/components/player";
import { spawnCamera } from "@client/entities/camera";
import type { UserWorld } from "@engine";
import { createSystem } from "@engine";
import { Camera, Transform2D } from "@engine/components";
import { World, fromContext } from "@engine/context";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export const System = createSystem("main:networked-local-camera")({
  system() {
    const world = fromContext(World);
    const [playerId] = world.query(PlayerComponent, Transform2D);

    if (playerId === undefined) {
      return;
    }

    const playerTransform = world.require(playerId, Transform2D);
    const cameraTransform = requireCameraTransform(world);

    cameraTransform.curr.copyFrom(playerTransform.curr);
    cameraTransform.prev.copyFrom(playerTransform.prev);
  },
});

function requireCameraTransform(world: UserWorld): Transform2D {
  const [cameraId] = world.query(Camera, Transform2D);

  if (cameraId !== undefined) {
    return world.require(cameraId, Transform2D);
  }

  const nextCameraId = spawnCamera(world);
  return world.require(nextCameraId, Transform2D);
}