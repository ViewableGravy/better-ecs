import type { EntityId } from "@engine/ecs/entity";
import type { UserWorld } from "@engine/ecs/world";
import { pointToWorldFromEngine, resolveActiveCameraViewFromEngine } from "@engine/internal/utils";
import type { EngineInputHost, Point2D } from "@engine/core/input";

export class EngineUtils {
  readonly #engine: EngineInputHost;

  public constructor(engine: EngineInputHost) {
    this.#engine = engine;
  }

  public activeCameraView(world: UserWorld, cameraEntityId?: EntityId) {
    return resolveActiveCameraViewFromEngine(this.#engine, world, cameraEntityId);
  }

  public pointToWorld(point: Point2D, world: UserWorld = this.#engine.scene.world, cameraEntityId?: EntityId): Point2D {
    return pointToWorldFromEngine(this.#engine, point, world, cameraEntityId);
  }
}
