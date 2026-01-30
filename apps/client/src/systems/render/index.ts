import { createSystem, useEngine, useSystem, useWorld } from "@repo/engine";
import { Transform } from "@repo/engine/components";
import z from "zod";

export const System = createSystem("render")({
  initialize: Initialize,
  system: Entrypoint,
  phase: "render",
  schema: {
    default: {},
    schema: z.object({}),
  },
});

/**
 * Lerp between previous and current position based on interpolation factor
 */
function lerp(prev: number, current: number, alpha: number): number {
  return prev + ((current - prev) * alpha);
}

function Entrypoint() {
  const engine = useEngine();
  const world = useWorld();

  const canvas = document.getElementById("game") as HTMLCanvasElement;
  const context = canvas.getContext("2d");

  if (!context) return;

  // Calculate interpolation factor based on time since last update
  // This prevents teleporting by resetting to 0 after each update
  const updateTimeMs = 1000 / engine.frame.ups;
  const timeSinceLastUpdate = performance.now() - engine.frame.lastUpdateTime;
  const alpha = Math.min(timeSinceLastUpdate / updateTimeMs, 1.0);

  // Clear the canvas
  context.clearRect(0, 0, canvas.width, canvas.height);

  for (const entityId of world.query(Transform)) {
    const transform = world.get(entityId, Transform);

    if (!transform) continue;

    // Interpolate between previous and current position
    const interpolatedX = lerp(transform.prev.x, transform.curr.x, alpha);
    const interpolatedY = lerp(transform.prev.y, transform.curr.y, alpha);

    // Draw the entity as a rectangle at the interpolated position
    context.fillRect(interpolatedX, interpolatedY, 10, 10);
  }
}

function Initialize() {
  function resizeCanvas(): void {
    const canvas = document.getElementById("game") as HTMLCanvasElement;
    if (!canvas) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);
}