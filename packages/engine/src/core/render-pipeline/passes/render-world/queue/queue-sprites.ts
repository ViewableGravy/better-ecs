import { Sprite } from "../../../../../components";
import type { UserWorld } from "../../../../../ecs/world";
import type { RenderQueue } from "../../../../../render/render-queue";

export function queueSprites(world: UserWorld, queue: RenderQueue): void {
  for (const id of world.query(Sprite)) {
    queue.addSprite(id);
  }
}
