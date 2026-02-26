import { Sprite } from "../../../../../components";
import { Transform2D } from "../../../../../components/transform";
import { resolveWorldTransform2D } from "../../../../../ecs/hierarchy";
import type { UserWorld } from "../../../../../ecs/world";
import type { RenderQueue } from "../../../../../render/render-queue";
import type { Renderer } from "../../../../../render/renderer";

const SHARED_RENDER_TRANSFORM = new Transform2D();

export function renderSprites(
  world: UserWorld,
  queue: RenderQueue,
  renderer: Renderer,
  alpha: number,
): void {
  for (const id of queue.sprites) {
    const sprite = world.require(id, Sprite);

    if (!resolveWorldTransform2D(world, id, SHARED_RENDER_TRANSFORM)) {
      continue;
    }

    renderer.high.render(sprite, SHARED_RENDER_TRANSFORM, alpha);
  }
}
