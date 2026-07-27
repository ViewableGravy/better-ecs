import { type PlayerAnimationState, type PlayerDirection } from "@legacy/components/player";
import type { EntityId, Registry } from "@engine";
import { AnimatedSprite } from "@engine/components";

import { createPlayerSprite } from "@legacy/entities/player/render/createPlayerSprite";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export function ensurePlayerSprite(
  world: Registry,
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