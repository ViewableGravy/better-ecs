import { type PlayerAnimationState, type PlayerDirection } from "@client/components/player";
import type { EntityId, UserWorld } from "@engine";
import { AnimatedSprite } from "@engine/components";

import { createPlayerSprite } from "@client/entities/player/render/createPlayerSprite";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export function ensurePlayerSprite(
  world: UserWorld,
  playerId: EntityId,
  animationState: PlayerAnimationState,
  direction: PlayerDirection,
): AnimatedSprite {
  const animatedSprite = world.get(playerId, AnimatedSprite);

  if (animatedSprite) {
    return animatedSprite;
  }

  const nextAnimatedSprite = createPlayerSprite(animationState, direction);
  world.add(playerId, AnimatedSprite, nextAnimatedSprite);

  return nextAnimatedSprite;
}