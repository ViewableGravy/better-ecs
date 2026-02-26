import { Shape } from "../../../../../components";
import type { UserWorld } from "../../../../../ecs/world";
import type { RenderQueue } from "../../../../../render/render-queue";

export function sortShapes(world: UserWorld, queue: RenderQueue): void {
  queue.sortShapes((a, b) => {
    const shapeA = world.get(a, Shape);
    const shapeB = world.get(b, Shape);

    if (!shapeA || !shapeB) {
      return 0;
    }

    if (shapeA.layer !== shapeB.layer) {
      return shapeA.layer - shapeB.layer;
    }

    return shapeA.zOrder - shapeB.zOrder;
  });
}
