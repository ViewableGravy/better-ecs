import type { EntityId, Registry } from "@engine";
import { Camera, Debug, Transform2D } from "@engine/components";

export function spawnCamera(world: Registry): EntityId<Camera> {
  const entity = world.create();
  const camera = new Camera("orthographic", 300);
  camera.primary = true;

  world.add(entity, new Transform2D(0, 0));
  world.add(entity, camera);
  world.add(entity, new Debug("camera"));

  // Entity tags are compile-time only; Registry#create returns the untagged runtime id.
  return entity as EntityId<Camera>;
}
