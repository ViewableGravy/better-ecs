import { OrbitMotion } from "@/components/orbit-motion";
import { PlayerComponent } from "@/components/player";
import type { EntityId, UserWorld } from "@repo/engine";
import {
  Color,
  Parent,
  Shape,
  Sprite,
  Transform2D,
} from "@repo/engine/components";
import { CircleCollider } from "@repo/physics";

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
  const playerComponent = new PlayerComponent("NewPlayer"); // identifier since player is unique
  const collider = new CircleCollider(16);

  // Create a sprite component referencing the asset by key
  const sprite = new Sprite("player-sprite", 40, 40);

  world.add(player, transform);
  world.add(player, playerComponent);
  world.add(player, sprite);
  world.add(player, collider);

  const orbitAnchor = world.create();
  world.add(orbitAnchor, new Parent(player));
  world.add(orbitAnchor, new Transform2D(0, 0));

  const orbitingCircle = world.create();
  world.add(orbitingCircle, new Parent(orbitAnchor));
  world.add(orbitingCircle, new Transform2D(36, 0));
  world.add(orbitingCircle, new OrbitMotion(36, Math.PI));
  world.add(
    orbitingCircle,
    new Shape(
      "circle",
      10,
      10,
      new Color(0.95, 0.85, 0.3, 1),
      new Color(1, 1, 1, 0.8),
      1,
      5,
      1,
    ),
  );

  return player;
}
