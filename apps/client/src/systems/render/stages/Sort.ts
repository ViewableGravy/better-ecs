import { useSystem, useWorld } from "@repo/engine";
import { Shape, Sprite } from "@repo/engine/components";

export function SortStage(): void {
  const world = useWorld();
  const { data } = useSystem("render");

  data.queue.sortSprites((a, b) => {
    const sa = world.get(a, Sprite);
    const sb = world.get(b, Sprite);
    if (!sa || !sb) return 0;
    if (sa.layer !== sb.layer) return sa.layer - sb.layer;
    return sa.zOrder - sb.zOrder;
  });

  data.queue.sortShapes((a, b) => {
    const sa = world.get(a, Shape);
    const sb = world.get(b, Shape);
    if (!sa || !sb) return 0;
    if (sa.layer !== sb.layer) return sa.layer - sb.layer;
    return sa.zOrder - sb.zOrder;
  });
}
