import { OrbitMotion } from "@client/components/orbit-motion";
import { PlayerComponent } from "@client/components/player";
import { PlayerFeetComponent } from "@client/components/player-feet";
import { RENDER_LAYERS } from "@client/consts";
import { CollisionProfiles } from "@client/scenes/world/physics/collision-profiles";
import { Vec2, type EntityId, type UserWorld } from "@engine";
import {
  Color,
  Debug,
  Parent,
  Shape,
  Sprite,
  Transform2D,
} from "@engine/components";
import { CircleCollider, RectangleCollider } from "@libs/physics";

export function ensurePlayer(world: UserWorld) {
  let [player] = world.query(PlayerComponent);

  if (!player) {
    player = spawnPlayer(world);
  }

  return player;
}

export function spawnPlayer(world: UserWorld): EntityId {
  const player = world.create();

  // Create a sprite component referencing the asset by key
  const sprite = new Sprite("player-sprite", 40, 40);
  sprite.layer = RENDER_LAYERS.world;
  sprite.zOrder = 1;

  world.add(player, sprite);
  world.add(player, new Transform2D(0, 0));
  world.add(player, new PlayerComponent("NewPlayer"));
  world.add(player, new CircleCollider(16));
  world.add(player, CollisionProfiles.actor());
  world.add(player, new Debug("player"));

  const feet = world.create();
  world.add(feet, new Parent(player));
  world.add(feet, new Transform2D(0, 15));
  world.add(feet, new RectangleCollider(new Vec2(-7.5, 0), new Vec2(15, 2)));
  world.add(feet, CollisionProfiles.ghost());
  world.add(feet, new PlayerFeetComponent(player));
  world.add(feet, new Debug("player-feet"));

  const orbitAnchor = world.create();
  world.add(orbitAnchor, new Parent(player));
  world.add(orbitAnchor, new Transform2D(0, 0));
  world.add(orbitAnchor, new Debug("player-orbit-anchor"));

  const orbitingCircle = world.create();
  world.add(orbitingCircle, new Parent(orbitAnchor));
  world.add(orbitingCircle, new Transform2D(36, 0));
  world.add(orbitingCircle, new OrbitMotion(36, Math.PI));
  world.add(orbitingCircle, new Debug("player-orbit-circle"));
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
