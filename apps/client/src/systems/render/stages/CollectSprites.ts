import { useSystem, useWorld } from "@repo/engine";
import { Sprite, Transform2D } from "@repo/engine/components";

export function CollectSpritesStage(): void {
  const world = useWorld();
  const { data } = useSystem("render");

  for (const id of world.query(Sprite, Transform2D)) {
    data.queue.addSprite(id);
  }
}
