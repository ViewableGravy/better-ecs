import type { EngineContextOptions } from "../context";
import type { Point2D } from "../core/input";
import type { EntityId, UserWorld } from "../index";
import type { CameraView } from "../internal/utils";
import { pointToWorldFromEngine, resolveActiveCameraViewFromEngine } from "../internal/utils";

export function ActiveCameraView(
  world: UserWorld,
  cameraEntityId?: EntityId,
): EngineContextOptions<CameraView> {
  return {
    select: (engine) => resolveActiveCameraViewFromEngine(engine, world, cameraEntityId),
  };
}

export function PointToWorld(
  point: Point2D,
  world: UserWorld,
  cameraEntityId?: EntityId,
): EngineContextOptions<Point2D> {
  return {
    select: (engine) => pointToWorldFromEngine(engine, point, world, cameraEntityId),
  };
}
