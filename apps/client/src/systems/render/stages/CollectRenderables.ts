import type { UserWorld } from "@repo/engine";
import { Shape, Sprite, Transform2D } from "@repo/engine/components";
import type { RenderQueue } from "@repo/engine/render";

export function collectRenderables(world: UserWorld, queue: RenderQueue): void {
  for (const id of world.query(Sprite, Transform2D)) {
    queue.addSprite(id);
  }

  for (const id of world.query(Shape, Transform2D)) {
    queue.addShape(id);
  }
}
