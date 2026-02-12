import type { UserWorld } from "@repo/engine";
import { Camera, Shape, Sprite, Transform2D } from "@repo/engine/components";
import type { RenderQueue, Renderer } from "@repo/engine/render";

export function commitWorld(
  world: UserWorld,
  renderer: Renderer,
  queue: RenderQueue,
  alpha: number,
): void {
  // --- Camera ---
  let cameraSet = false;
  for (const id of world.query(Camera, Transform2D)) {
    const camera = world.get(id, Camera);
    const transform = world.get(id, Transform2D);

    if (camera && camera.enabled && transform) {
      renderer.high.set(camera, transform, alpha);
      cameraSet = true;
      break; // Only support one camera for now
    }
  }

  if (!cameraSet) {
    renderer.low.setCamera(0, 0, 1);
  }

  // --- Render Queue Processing ---

  // 1. Shapes
  for (const id of queue.shapes) {
    const shape = world.get(id, Shape);
    const transform = world.get(id, Transform2D);
    if (shape && transform) {
      renderer.high.render(shape, transform, alpha);
    }
  }

  // 2. Sprites
  for (const id of queue.sprites) {
    const sprite = world.get(id, Sprite);
    const transform = world.get(id, Transform2D);
    if (sprite && transform) {
      renderer.high.render(sprite, transform, alpha);
    }
  }
}
