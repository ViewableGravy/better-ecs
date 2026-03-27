import type { EntityId, UserWorld } from "@engine";
import { AnimatedSprite, Debug, Transform2D } from "@engine/components";
import { PlayerComponent } from "@server/scenes/demo/components/PlayerComponent";
import { createPlayerSprite } from "@server/scenes/demo/entities/player/createPlayerSprite";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export const PLAYER_GROUNDED_HITBOX_RADIUS = 3;

export function spawnPlayer(world: UserWorld): EntityId<PlayerComponent> {
  const player = world.create();
  const sprite = createPlayerSprite("idle", "s");

  world.add(player, AnimatedSprite, sprite);
  world.add(player, new Transform2D(0, 0));
  world.add(player, new PlayerComponent("NewPlayer"));
  world.add(player, new Debug("player"));

  return player as EntityId<PlayerComponent>;
}