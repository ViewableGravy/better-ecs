import { useSystem, useWorld } from "@repo/engine";
import { Shape, Sprite, Transform2D } from "@repo/engine/components";

export function CollectRenderablesStage(): void {
  const world = useWorld();
  const { data } = useSystem("render");
  const queue = data.queue;

  for (const id of world.query(Sprite, Transform2D)) {
    queue.addSprite(id);
  }

  for (const id of world.query(Shape, Transform2D)) {
    queue.addShape(id);
  }
}
