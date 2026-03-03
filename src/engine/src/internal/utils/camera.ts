import { Camera } from "@engine/components/camera";
import { Transform2D } from "@engine/components/transform";
import type { EngineInputHost, Point2D } from "@engine/core/input";
import type { EntityId } from "@engine/ecs/entity";
import type { UserWorld } from "@engine/ecs/world";

export type CameraView = {
  x: number;
  y: number;
  zoom: number;
};

const CAMERA_VIEW_BUFFER: CameraView = {
  x: 0,
  y: 0,
  zoom: 1,
};

export function resolveActiveCameraViewFromEngine(
  engine: EngineInputHost,
  world: UserWorld,
  cameraEntityId?: EntityId,
): CameraView {
  const camera = engine.editor.camera;

  if (camera.mode === "engine") {
    CAMERA_VIEW_BUFFER.x = camera.x;
    CAMERA_VIEW_BUFFER.y = camera.y;
    CAMERA_VIEW_BUFFER.zoom = camera.zoom > 0 ? camera.zoom : 1;
    return CAMERA_VIEW_BUFFER;
  }

  const selection = resolveCameraSelection(world, cameraEntityId);
  if (!selection) {
    CAMERA_VIEW_BUFFER.x = 0;
    CAMERA_VIEW_BUFFER.y = 0;
    CAMERA_VIEW_BUFFER.zoom = 1;
    return CAMERA_VIEW_BUFFER;
  }

  const viewportHeight = engine.canvas.getBoundingClientRect().height;
  const zoom = selection.camera.orthoSize > 0 ? viewportHeight / (selection.camera.orthoSize * 2) : 1;

  CAMERA_VIEW_BUFFER.x = selection.transform.curr.pos.x;
  CAMERA_VIEW_BUFFER.y = selection.transform.curr.pos.y;
  CAMERA_VIEW_BUFFER.zoom = zoom;

  return CAMERA_VIEW_BUFFER;
}

export function pointToWorldFromEngine(
  engine: EngineInputHost,
  point: Point2D,
  world: UserWorld,
  cameraEntityId?: EntityId,
): Point2D {
  const cameraView = resolveActiveCameraViewFromEngine(engine, world, cameraEntityId);
  const canvas = engine.canvas;
  const viewport = canvas.getBoundingClientRect();

  return {
    x: (point.x - viewport.width / 2) / cameraView.zoom + cameraView.x,
    y: (point.y - viewport.height / 2) / cameraView.zoom + cameraView.y,
  };
}

function resolveCameraSelection(
  world: UserWorld,
  cameraEntityId?: EntityId,
): { camera: Camera; transform: Transform2D } | undefined {
  if (cameraEntityId !== undefined) {
    const camera = world.get(cameraEntityId, Camera);
    const transform = world.get(cameraEntityId, Transform2D);

    if (camera && camera.enabled && transform) {
      return { camera, transform };
    }
  }

  let fallbackSelection: { camera: Camera; transform: Transform2D } | undefined;

  for (const id of world.query(Camera, Transform2D)) {
    const camera = world.get(id, Camera);
    const transform = world.get(id, Transform2D);

    if (!camera || !camera.enabled || !transform) {
      continue;
    }

    if (camera.primary) {
      return { camera, transform };
    }

    if (!fallbackSelection) {
      fallbackSelection = { camera, transform };
    }
  }

  return fallbackSelection;
}