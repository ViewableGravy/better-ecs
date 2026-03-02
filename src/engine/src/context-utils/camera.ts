import type { EngineContextOptions } from "@engine/context";
import type { Point2D } from "@engine/core/input";
import type { EntityId, UserWorld } from "@engine/index";
import type { CameraView } from "@engine/internal/utils";
import { pointToWorldFromEngine, resolveActiveCameraViewFromEngine } from "@engine/internal/utils";

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
