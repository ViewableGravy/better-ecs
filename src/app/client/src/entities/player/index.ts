import { PlayerComponent } from "@client/components/player";
import { createPlayerSprite } from "@client/entities/player/render/create-player-sprite";
import { CollisionProfiles } from "@client/physics/collision-profiles";
import { type EntityId, type Registry } from "@engine";
import { AnimatedSprite, Debug, Transform2D } from "@engine/components";
import { CircleCollider } from "@libs/physics";

export const PLAYER_GROUNDED_HITBOX_RADIUS = 3;

export function spawnPlayer(world: Registry): EntityId<PlayerComponent> {
  const entity = world.create();

  world.add(entity, AnimatedSprite, createPlayerSprite("idle", "s"));
  world.add(entity, new Transform2D(0, 0));
  world.add(entity, new PlayerComponent());
  world.add(entity, new CircleCollider(PLAYER_GROUNDED_HITBOX_RADIUS));
  world.add(entity, CollisionProfiles.actor());
  world.add(entity, new Debug("player"));

  // Entity tags are compile-time only; Registry#create returns the untagged runtime id.
  return entity as EntityId<PlayerComponent>;
}
