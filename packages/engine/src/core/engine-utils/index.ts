import type { EntityId } from "../../ecs/entity";
import type { UserWorld } from "../../ecs/world";
import { pointToWorldFromEngine, resolveActiveCameraViewFromEngine } from "../../internal/utils";
import type { EngineInputHost, Point2D } from "../input";

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
