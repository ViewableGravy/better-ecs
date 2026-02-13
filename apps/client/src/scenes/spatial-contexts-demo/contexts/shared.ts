import { spawnCamera } from "@/entities/camera";
import { ensurePlayer } from "@/entities/player";
import { CircleCollider } from "@plugins/collisions/colliders/circle";
import type { UserWorld } from "@repo/engine";
import { Transform2D } from "@repo/engine/components";

export function setupContextPlayer(world: UserWorld, x: number, y: number): void {
  spawnCamera(world);

  const playerId = ensurePlayer(world);
  if (!world.get(playerId, CircleCollider)) {
    world.add(playerId, new CircleCollider(16));
  }

  const playerTransform = world.get(playerId, Transform2D);
  if (!playerTransform) {
    return;
  }

  playerTransform.curr.pos.set(x, y);
  playerTransform.prev.pos.set(x, y);
}
