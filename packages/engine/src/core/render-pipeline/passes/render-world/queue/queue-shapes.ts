import { Shape } from "../../../../../components";
import type { UserWorld } from "../../../../../ecs/world";
import type { RenderQueue } from "../../../../../render/render-queue";

export function queueShapes(world: UserWorld, queue: RenderQueue): void {
  for (const id of world.query(Shape)) {
    queue.addShape(id);
  }
}
