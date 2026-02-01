import { useEngine, useSystem, useWorld } from "@repo/engine";
import { Camera, Transform2D } from "@repo/engine/components";
import type { View2D } from "../render/Commands";
import { lerp } from "../render/utils";

const DEFAULT_VIEW: View2D = { x: 0, y: 0, zoom: 1 };

export function ExtractViewStage(): void {
  const world = useWorld();
  const engine = useEngine();
  const { data } = useSystem("render");

  const renderer = data.renderer;
  const commands = data.commands;

  // Calculate interpolation factor based on time since last update
  const updateTimeMs = 1000 / engine.frame.ups;
  const timeSinceLastUpdate = performance.now() - engine.frame.lastUpdateTime;
  const alpha = Math.min(timeSinceLastUpdate / updateTimeMs, 1.0);
  data.custom.alpha = alpha;

  const view = data.custom.view ?? DEFAULT_VIEW;
  if (!data.custom.view) {
    data.custom.view = view;
  }

  let found = false;

  for (const id of world.query(Camera, Transform2D)) {
    const cam = world.get(id, Camera);
    const t = world.get(id, Transform2D);

    if (!cam?.enabled || !t) continue;

    view.x = lerp(t.prev.pos.x, t.curr.pos.x, alpha);
    view.y = lerp(t.prev.pos.y, t.curr.pos.y, alpha);
    view.zoom = renderer.getHeight() / (cam.orthoSize * 2);

    commands.push({
      kind: "setView",
      view,
    });

    found = true;
    break;
  }

  if (!found) {
    view.x = 0;
    view.y = 0;
    view.zoom = 1;
    commands.push({
      kind: "setView",
      view,
    });
  }
}