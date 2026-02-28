import { AnimatedSprite, update } from "@components/sprite/animated";
import { FromEngine, FromRender, fromContext } from "@context";
import type { UserWorld } from "@ecs/world";

/**
 * Updates all animated sprites in the world by advancing their animation frames based on the elapsed time since the last update. 
 * This should be called once per frame to ensure that all animated sprites progress their animations correctly.
 */
export function updateAnimatedSprites(
  world: UserWorld = fromContext(FromRender.World),
  [, frameDelta]: [number, number, number] = fromContext(FromEngine.Delta),
): void {
  for (const id of world.query(AnimatedSprite)) {
    update(world.require(id, AnimatedSprite), frameDelta);
  }
}
