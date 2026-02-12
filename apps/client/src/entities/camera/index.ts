import type { UserWorld } from "@repo/engine";
import { Camera, Transform2D } from "@repo/engine/components";

export function spawnCamera(world: UserWorld): number {
  const cameraEntity = world.create();
  world.add(cameraEntity, new Transform2D(0, 0));
  world.add(cameraEntity, new Camera("orthographic", 300)); // orthoSize of 300 world units

  return cameraEntity;
}
