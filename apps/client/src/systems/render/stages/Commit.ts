import { useEngine, useSystem, useWorld } from "@repo/engine";
import { Camera, Color, Shape, Sprite, Transform2D } from "@repo/engine/components";
import { lerp } from "../render/utils";

const CLEAR_COLOR = new Color(0.1, 0.1, 0.15, 1);

export function CommitStage(): void {
  const world = useWorld();
  const engine = useEngine();
  const { data } = useSystem("render");

  const { renderer, queue } = data;

  // Calculate interpolation alpha here since we removed ExtractView
  const updateTimeMs = 1000 / engine.frame.ups;
  const timeSinceLastUpdate = performance.now() - engine.frame.lastUpdateTime;
  const alpha = Math.min(timeSinceLastUpdate / updateTimeMs, 1.0);

  renderer.beginFrame();
  renderer.clear(CLEAR_COLOR);

  // --- Camera System State ---
  // Querying for camera directly instead of relying on context
  let cameraSet = false;
  for (const id of world.query(Camera, Transform2D)) {
    const camera = world.get(id, Camera);
    const transform = world.get(id, Transform2D);

    if (camera && camera.enabled && transform) {
      // Calculate interpolated camera position
      const x = lerp(transform.prev.pos.x, transform.curr.pos.x, alpha);
      const y = lerp(transform.prev.pos.y, transform.curr.pos.y, alpha);
      const zoom = renderer.getHeight() / (camera.orthoSize * 2);

      renderer.setCamera(x, y, zoom);
      cameraSet = true;
      break; // Only support one camera for now
    }
  }

  if (!cameraSet) {
    // Default Identity Camera
    renderer.setCamera(0, 0, 1);
  }

  // --- Render Queue Processing ---

  // 1. Shapes
  for (const id of queue.shapes) {
    const shape = world.get(id, Shape);
    const transform = world.get(id, Transform2D);
    if (shape && transform) {
      renderer.renderShape(shape, transform, alpha);
    }
  }

  // 2. Sprites
  for (const id of queue.sprites) {
    const sprite = world.get(id, Sprite);
    const transform = world.get(id, Transform2D);
    if (sprite && transform) {
      renderer.renderSprite(sprite, transform, alpha);
    }
  }

  renderer.endFrame();
}
