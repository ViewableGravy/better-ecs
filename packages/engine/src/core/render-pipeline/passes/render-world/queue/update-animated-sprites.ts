import { AnimatedSprite } from "@components";
import { FromEngine, FromRender, fromContext } from "@context";
import type { UserWorld } from "@ecs/world";

export function updateAnimatedSprites(
  world: UserWorld = fromContext(FromRender.World),
  [, frameDelta]: [number, number, number] = fromContext(FromEngine.Delta),
): void {
  for (const id of world.query(AnimatedSprite)) {
    world.require(id, AnimatedSprite).update(frameDelta);
  }
}
