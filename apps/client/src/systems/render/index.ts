import { Vec3 } from "@repo/engine";
import { createSystem, useEngine, useWorld } from "@repo/engine/core";
import z from "zod";
import { PreviousPosition } from "../../components/previousPosition";

export const System = createSystem("render")({
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

  for (const entityId of world.query(Vec3, PreviousPosition)) {
    const position = world.get(entityId, Vec3);
    const previousPosition = world.get(entityId, PreviousPosition);

    if (!position || !previousPosition) continue;

    // Interpolate between previous and current position
    const interpolatedX = lerp(previousPosition.x, position.x, alpha);
    const interpolatedY = lerp(previousPosition.y, position.y, alpha);

    // Draw the entity as a rectangle at the interpolated position
    context.fillRect(interpolatedX, interpolatedY, 10, 10);
  }
}
