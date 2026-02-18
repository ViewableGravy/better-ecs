import { clamp, createSystem, useEngine, useSystem } from "@repo/engine";
import { Camera } from "@repo/engine/components";
import z from "zod";

const MIN_ORTHO_SIZE = 120;
const MAX_ORTHO_SIZE = 2400;
const ZOOM_SENSITIVITY = 0.0015;

export const System = createSystem("camera-zoom")({
  schema: {
    default: {
      pendingWheelDelta: 0,
      wheelHandler: null,
    },
    schema: z.object({
      pendingWheelDelta: z.number(),
      wheelHandler: z.function({
        input: [z.instanceof(WheelEvent)],
        output: z.void(),
      }).nullable(),
    })
  },
  initialize() {
    const { canvas } = useEngine()
    const { data } = useSystem("camera-zoom");

    data.wheelHandler = (event: WheelEvent) => {
      data.pendingWheelDelta += normalizeWheelDelta(event);
      event.preventDefault();
    };

    canvas.addEventListener("wheel", data.wheelHandler, { passive: false });

    return () => {
      if (!data.wheelHandler) {
        return;
      }

      canvas.removeEventListener("wheel", data.wheelHandler);
      data.wheelHandler = null;
    };
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

function normalizeWheelDelta(event: WheelEvent): number {
  if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) {
    return event.deltaY * 16;
  }

  if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
    return event.deltaY * window.innerHeight;
  }

  return event.deltaY;
}