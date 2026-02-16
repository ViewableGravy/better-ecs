import { useEngine, type EntityId, type UserWorld } from "../index";
import { Camera } from "./camera";
import { Transform2D } from "./transform";

export type CameraView = {
  x: number;
  y: number;
  zoom: number;
};

export type CameraSelection = {
  camera: Camera;
  transform: Transform2D;
};

const cameraViewBuffer: CameraView = {
  x: 0,
  y: 0,
  zoom: 1,
};

export function resolveCameraSelection(
  world: UserWorld,
  cameraEntityId?: EntityId,
): CameraSelection | undefined {
  if (cameraEntityId !== undefined) {
    const camera = world.get(cameraEntityId, Camera);
    const transform = world.get(cameraEntityId, Transform2D);

    if (camera && camera.enabled && transform) {
      return { camera, transform };
    }
  }

  for (const id of world.query(Camera, Transform2D)) {
    const camera = world.get(id, Camera);
    const transform = world.get(id, Transform2D);

    if (!camera || !camera.enabled || !transform) {
      continue;
    }

    return { camera, transform };
  }

  return undefined;
}

export function resolveCameraView(
  world: UserWorld,
  cameraEntityId?: EntityId,
): CameraView {
  const selection = resolveCameraSelection(world, cameraEntityId);

  if (!selection) {
    cameraViewBuffer.x = 0;
    cameraViewBuffer.y = 0;
    cameraViewBuffer.zoom = 1;
    return cameraViewBuffer;
  }

  const { camera, transform } = selection;
  const viewportHeight = resolveViewportHeight();
  const zoom = camera.orthoSize > 0 ? viewportHeight / (camera.orthoSize * 2) : 1;

  cameraViewBuffer.x = transform.curr.pos.x;
  cameraViewBuffer.y = transform.curr.pos.y;
  cameraViewBuffer.zoom = zoom;

  return cameraViewBuffer;
}

export function screenToWorld(
  screenValue: number,
  viewportSize: number,
  cameraAxis: number,
  cameraZoom: number,
): number {
  return (screenValue - viewportSize / 2) / cameraZoom + cameraAxis;
}

function resolveViewportHeight(): number {
  const canvas = useEngine().canvas;
  if (canvas) {
    return canvas.getBoundingClientRect().height;
  }

  if (typeof window !== "undefined") {
    return window.innerHeight;
  }

  return 0;
}
