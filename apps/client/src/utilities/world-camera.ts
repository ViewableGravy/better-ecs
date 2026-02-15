import type { EntityId, UserWorld } from "@repo/engine";
import { Camera, Transform2D } from "@repo/engine/components";

export type CameraView = {
  x: number;
  y: number;
  zoom: number;
};

export type CameraSelection = {
  camera: Camera;
  transform: Transform2D;
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
  viewportHeight: number,
  cameraEntityId?: EntityId,
): CameraView {
  const selection = resolveCameraSelection(world, cameraEntityId);

  if (!selection) {
    return { x: 0, y: 0, zoom: 1 };
  }

  const { camera, transform } = selection;
  const zoom = camera.orthoSize > 0 ? viewportHeight / (camera.orthoSize * 2) : 1;

  return {
    x: transform.curr.pos.x,
    y: transform.curr.pos.y,
    zoom,
  };
}

export function screenToWorld(
  screenX: number,
  screenY: number,
  viewportWidth: number,
  viewportHeight: number,
  camera: CameraView,
): { x: number; y: number } {
  return {
    x: (screenX - viewportWidth / 2) / camera.zoom + camera.x,
    y: (screenY - viewportHeight / 2) / camera.zoom + camera.y,
  };
}
