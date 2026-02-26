import { Sprite } from "../../../../../components";
import type { UserWorld } from "../../../../../ecs/world";
import type { RenderQueue } from "../../../../../render/render-queue";

export function sortSprites(world: UserWorld, queue: RenderQueue): void {
  queue.sortSprites((a, b) => {
    const spriteA = world.get(a, Sprite);
    const spriteB = world.get(b, Sprite);

    if (!spriteA || !spriteB) {
      return 0;
    }

    if (spriteA.layer !== spriteB.layer) {
      return spriteA.layer - spriteB.layer;
    }

    return spriteA.zOrder - spriteB.zOrder;
  });
}
