import type { UserWorld } from "@repo/engine";
import { Shape, Sprite } from "@repo/engine/components";
import type { RenderQueue } from "@repo/engine/render";

export function collectRenderables(world: UserWorld, queue: RenderQueue): void {
  for (const id of world.query(Sprite)) {
    queue.addSprite(id);
  }

  for (const id of world.query(Shape)) {
    queue.addShape(id);
  }
}
