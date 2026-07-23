import { spawnCamera } from "@client/entities/camera";
import { ensurePlayer } from "@client/entities/player";
import type { UserWorld } from "@engine";
import { Transform2D } from "@engine/components";

export function setupContextCamera(world: UserWorld): void {
  spawnCamera(world);
}

export function setupContextPlayer(world: UserWorld, x: number, y: number): void {
  setupContextCamera(world);

  const playerId = ensurePlayer(world);

  world.patch(playerId, Transform2D, (playerTransform) => {
    playerTransform.curr.pos.set(x, y);
    playerTransform.prev.pos.set(x, y);
  });
}
