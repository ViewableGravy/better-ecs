import { PlayerComponent } from "@/components/player";
import type { EntityId, UserWorld } from "@repo/engine";
import { Sprite, Transform2D } from "@repo/engine/components";

export function ensurePlayer(world: UserWorld) {
  let [player] = world.query(PlayerComponent);

  if (!player) {
    player = spawnPlayer(world);
  }

  return player;
}

export function spawnPlayer(world: UserWorld): EntityId {
  const player = world.create();
  const transform = new Transform2D(0, 0);
  const playerComponent = new PlayerComponent("NewPlayer");

  // Create a sprite component referencing the asset by key
  const sprite = new Sprite("player-sprite", 40, 40);

  world.add(player, transform);
  world.add(player, playerComponent);
  world.add(player, sprite);

  return player;
}
