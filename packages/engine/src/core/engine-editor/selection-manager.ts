import { Transform2D } from "../../components";
import type { EntityId } from "../../ecs/entity";
import { resolveWorldTransform2D } from "../../ecs/hierarchy";
import type { UserWorld } from "../../ecs/world";

type EngineEditorSelectionManagerOptions = {
  getWorld: () => UserWorld;
};

export class EngineEditorSelectionManager {
  readonly #getWorld: () => UserWorld;
  readonly #SHARED_TRANSFORM2D = new Transform2D();

  public constructor(options: EngineEditorSelectionManagerOptions) {
    this.#getWorld = options.getWorld;
  }

  public entityAtPoint(worldX: number, worldY: number, maxDistance: number): EntityId | null {
    if (maxDistance <= 0) {
      return null;
    }

    const world = this.#getWorld();
    const maxDistanceSquared = maxDistance * maxDistance;

    let nearestEntityId: EntityId | null = null;
    let nearestDistanceSquared = maxDistanceSquared;

    for (const entityId of world.query(Transform2D)) {
      if (!resolveWorldTransform2D(world, entityId, this.#SHARED_TRANSFORM2D)) {
        continue;
      }

      const deltaX = this.#SHARED_TRANSFORM2D.curr.pos.x - worldX;
      const deltaY = this.#SHARED_TRANSFORM2D.curr.pos.y - worldY;
      const distanceSquared = deltaX * deltaX + deltaY * deltaY;
      if (distanceSquared > nearestDistanceSquared) {
        continue;
      }

      nearestDistanceSquared = distanceSquared;
      nearestEntityId = entityId;
    }

    return nearestEntityId;
  }
}