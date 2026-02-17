import { resolveWorldTransform2D, useEngine, type UserWorld } from "@repo/engine";
import { Camera, Shape, Sprite, Transform2D } from "@repo/engine/components";
import type { RenderQueue, Renderer } from "@repo/engine/render";
import { SpatialContexts } from "@repo/spatial-contexts";
import { drawGrid } from "./DrawGrid";

const BACKGROUND_LAYER_MAX = -1;
const SHARED_RENDER_TRANSFORM = new Transform2D();

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

  // 1. Background shapes
  for (const id of queue.shapes) {
    const shape = world.get(id, Shape);
    if (!shape) {
      continue;
    }

    if (!resolveWorldTransform2D(world, id, SHARED_RENDER_TRANSFORM)) {
      continue;
    }

    if (shape.layer > BACKGROUND_LAYER_MAX) {
      continue;
    }

    renderer.high.render(shape, SHARED_RENDER_TRANSFORM, alpha);
  }

  // 2. Grid overlay (above floor/background, below entities)
  const engine = useEngine();
  const manager = SpatialContexts.getManager(engine.scene.context);
  const focusedWorld = manager ? manager.focusedWorld : engine.world;

  if (focusedWorld === world) {
    drawGrid(world, renderer);
  }

  // 3. Foreground shapes
  for (const id of queue.shapes) {
    const shape = world.get(id, Shape);
    if (!shape) {
      continue;
    }

    if (!resolveWorldTransform2D(world, id, SHARED_RENDER_TRANSFORM)) {
      continue;
    }

    if (shape.layer <= BACKGROUND_LAYER_MAX) {
      continue;
    }

    renderer.high.render(shape, SHARED_RENDER_TRANSFORM, alpha);
  }

  // 4. Sprites
  for (const id of queue.sprites) {
    const sprite = world.get(id, Sprite);
    if (!sprite) {
      continue;
    }

    if (resolveWorldTransform2D(world, id, SHARED_RENDER_TRANSFORM)) {
      renderer.high.render(sprite, SHARED_RENDER_TRANSFORM, alpha);
    }
  }
}
