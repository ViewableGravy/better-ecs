import { useEngine, useSystem, useWorld } from "@repo/engine";
import { Camera, Color, Shape, Sprite, Transform2D } from "@repo/engine/components";

const CLEAR_COLOR = new Color(0.1, 0.1, 0.15, 1);

export function CommitStage(): void {
  const world = useWorld();
  const engine = useEngine();
  const { data } = useSystem("render");

  const { renderer, queue } = data;

  // Calculate interpolation alpha
  const updateTimeMs = 1000 / engine.frame.ups;
  const timeSinceLastUpdate = performance.now() - engine.frame.lastUpdateTime;
  const alpha = Math.min(timeSinceLastUpdate / updateTimeMs, 1.0);

  renderer.high.begin();
  renderer.high.clear(CLEAR_COLOR);

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

  renderer.high.end();
}
