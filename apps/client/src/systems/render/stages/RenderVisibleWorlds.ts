import { useEngine, useSystem, useWorld } from "@repo/engine";
import { Color } from "@repo/engine/components";
import { getSpatialContextManager } from "@repo/spatial-contexts";
import { collectRenderables } from "./CollectRenderables";
import { commitWorld } from "./Commit";
import { sortRenderQueue } from "./Sort";

const CLEAR_COLOR = new Color(0.1, 0.1, 0.15, 1);

export function RenderVisibleWorldsStage(): void {
  const engine = useEngine();
  const { data } = useSystem("render");

  const { renderer, queue } = data;

  const scene = engine.scene.context;
  const manager = scene ? getSpatialContextManager(scene) : undefined;
  const worlds = manager ? manager.getVisibleWorlds() : [useWorld()];

  // Calculate interpolation alpha
  const updateTimeMs = 1000 / engine.frame.ups;
  const timeSinceLastUpdate = performance.now() - engine.frame.lastUpdateTime;
  const alpha = Math.min(timeSinceLastUpdate / updateTimeMs, 1.0);

  renderer.high.begin();
  renderer.high.clear(CLEAR_COLOR);

  for (const world of worlds) {
    queue.clear();
    collectRenderables(world, queue);
    sortRenderQueue(world, queue);
    commitWorld(world, renderer, queue, alpha);
  }

  renderer.high.end();
}
