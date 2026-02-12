import type { UserWorld } from "@repo/engine";
import { Shape, Sprite } from "@repo/engine/components";
import type { RenderQueue } from "@repo/engine/render";

export function sortRenderQueue(world: UserWorld, queue: RenderQueue): void {
  queue.sortSprites((a, b) => {
    const sa = world.get(a, Sprite);
    const sb = world.get(b, Sprite);
    if (!sa || !sb) return 0;
    if (sa.layer !== sb.layer) return sa.layer - sb.layer;
    return sa.zOrder - sb.zOrder;
  });

  queue.sortShapes((a, b) => {
    const sa = world.get(a, Shape);
    const sb = world.get(b, Shape);
    if (!sa || !sb) return 0;
    if (sa.layer !== sb.layer) return sa.layer - sb.layer;
    return sa.zOrder - sb.zOrder;
  });
}
