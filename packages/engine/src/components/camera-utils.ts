import { Engine, fromContext } from "../context";
import type { EngineInputHost, EntityId, UserWorld } from "../index";
import type { CameraView } from "../internal/utils";
import { resolveActiveCameraViewFromEngine as resolveActiveCameraViewFromEngineInternal } from "../internal/utils";
import type { Renderer } from "../render";
import { Camera } from "./camera";
import { Transform2D } from "./transform";

export type { CameraView } from "../internal/utils";

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

  let fallbackSelection: CameraSelection | undefined;

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

export function resolveActiveCameraViewFromEngine(
  engine: EngineInputHost,
  world: UserWorld,
  cameraEntityId?: EntityId,
): CameraView {
  return resolveActiveCameraViewFromEngineInternal(engine, world, cameraEntityId);
}

export function applyActiveCameraToRenderer(
  world: UserWorld,
  renderer: Renderer,
  alpha: number,
  cameraEntityId?: EntityId,
): void {
  const engine = fromContext(Engine);
  const camera = engine.editor.camera;

  if (camera.mode === "engine") {
    renderer.setCamera(camera.x, camera.y, camera.zoom > 0 ? camera.zoom : 1);
    return;
  }

  const selection = resolveCameraSelection(world, cameraEntityId);
  if (!selection) {
    renderer.setCamera(0, 0, 1);
    return;
  }

  renderer.set(selection.camera, selection.transform, alpha);
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
  const canvas = fromContext(Engine).canvas;
  return canvas.getBoundingClientRect().height;
}
