import { createSystem, useEngine, useSystem } from "@repo/engine";
import { Camera } from "@repo/engine/components";
import z from "zod";

const MIN_ORTHO_SIZE = 120;
const MAX_ORTHO_SIZE = 2400;
const ZOOM_SENSITIVITY = 0.0015;

export const System = createSystem("camera-zoom")({
  schema: {
    default: {
      pendingWheelDelta: 0,
    },
    schema: z.object({
      pendingWheelDelta: z.number(),
    })
  },
  initialize() {
    const { data } = useSystem("camera-zoom");

    window.addEventListener(
      "wheel",
      (event) => {
        data.pendingWheelDelta += normalizeWheelDelta(event);
        event.preventDefault();
      },
      { passive: false },
    );
  },
  system() {
    const { data } = useSystem("camera-zoom");

    if (data.pendingWheelDelta === 0) {
      return;
    }

    const wheelDelta = data.pendingWheelDelta;
    data.pendingWheelDelta = 0;

    const zoomFactor = Math.exp(wheelDelta * ZOOM_SENSITIVITY);
    const engine = useEngine();

    for (const world of engine.scene.context.worlds) {
      for (const cameraId of world.query(Camera)) {
        const camera = world.get(cameraId, Camera);
        if (!camera) {
          continue;
        }

        const nextOrthoSize = camera.orthoSize * zoomFactor;
        camera.orthoSize = clamp(nextOrthoSize, MIN_ORTHO_SIZE, MAX_ORTHO_SIZE);
      }
    }
  },
});

// TODO: move to engine/maths package and reuse in all places
function clamp(value: number, min: number, max: number): number {
  if (value < min) {
    return min;
  }

  if (value > max) {
    return max;
  }

  return value;
}

function normalizeWheelDelta(event: WheelEvent): number {
  if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) {
    return event.deltaY * 16;
  }

  if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
    return event.deltaY * window.innerHeight;
  }

  return event.deltaY;
}