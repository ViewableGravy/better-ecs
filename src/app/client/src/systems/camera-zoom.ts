import { clamp, createSystem } from "@engine";
import { Camera } from "@engine/components";
import { ActiveRegistry, Engine, System as ContextSystem, fromContext } from "@engine/context";

type CameraZoomState = {
  pendingWheelDelta: number;
  wheelHandler?: (event: WheelEvent) => void;
};

export const CameraZoom = createSystem("main:camera-zoom")({
  state: { pendingWheelDelta: 0 } as CameraZoomState,
  initialize() {
    const { canvas } = fromContext(Engine);
    const { data } = fromContext(ContextSystem("main:camera-zoom"));

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
      data.wheelHandler = undefined;
    };
  },
  system() {
    const { data } = fromContext(ContextSystem("main:camera-zoom"));
    if (data.pendingWheelDelta === 0) {
      return;
    }

    const zoomFactor = Math.exp(data.pendingWheelDelta * 0.0015);
    data.pendingWheelDelta = 0;
    const world = fromContext(ActiveRegistry);

    for (const cameraId of world.query(Camera)) {
      world.patch(cameraId, Camera, (camera) => {
        camera.orthoSize = clamp(camera.orthoSize * zoomFactor, 120, 2400);
      });
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
