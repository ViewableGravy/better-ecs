import { PlayerComponent } from "@/components/player";
import { PlayerUtils } from "@/entities/player/utils";
import { createSystem, useEngine, useWorld, type UserWorld } from "@repo/engine";
import { Camera, Transform2D } from "@repo/engine/components";
import * as SpatialContext from "@repo/spatial-contexts";
import { type ContextId, type SpatialContextManager } from "@repo/spatial-contexts";

export const System = createSystem("camera-follow")({
  system: Entrypoint,
});

function Entrypoint(): void {
  const engine = useEngine();
  const manager = SpatialContext.getManager(engine.scene.context);

  // If there is no spatial context manager, we just sync the camera to the player in the current world.
  if (!manager) {
    const world = useWorld();
    const playerTransform = PlayerUtils.getTransform(world);

    return syncWorldCamera(world, playerTransform);
  }

  const focusedWorld = manager.getWorld(manager.getFocusedContextId());
  if (!focusedWorld) {
    return;
  }

  const focusedPlayerTransform = getPlayerTransform(focusedWorld);
  if (!focusedPlayerTransform) {
    return;
  }

  for (const definition of manager.listDefinitions()) {
    syncContextCamera(definition.id, manager, focusedPlayerTransform);
  }
}

function getPlayerTransform(world: UserWorld): Transform2D | undefined {
  const [playerId] = world.query(PlayerComponent);

  if (playerId === undefined) {
    return undefined;
  }

  return world.get(playerId, Transform2D);
}

function syncContextCamera(
  contextId: ContextId,
  manager: SpatialContextManager,
  sourceTransform: Transform2D,
): void {
  const world = manager.getWorld(contextId);
  if (!world) {
    return;
  }

  syncWorldCamera(world, sourceTransform);
}

function syncWorldCamera(world: UserWorld, sourceTransform: Transform2D): void {
  for (const cameraId of world.query(Camera, Transform2D)) {
    const cameraTransform = world.get(cameraId, Transform2D);
    if (!cameraTransform) {
      continue;
    }

    cameraTransform.curr.pos.set(sourceTransform.curr.pos);
    cameraTransform.prev.pos.set(sourceTransform.prev.pos);
    return;
  }
}
