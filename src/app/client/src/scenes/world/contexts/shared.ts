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

  const playerTransform = world.get(playerId, Transform2D);
  if (!playerTransform) {
    return;
  }

  playerTransform.curr.pos.set(x, y);
  playerTransform.prev.pos.set(x, y);
}
