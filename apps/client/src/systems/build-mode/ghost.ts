import type { EntityId, UserWorld } from "@repo/engine";
import { Shape, Transform2D } from "@repo/engine/components";
import { GhostPreview } from "./components";
import { BOX_SIZE, GHOST_FILL, GHOST_STROKE, HALF_BOX_SIZE } from "./const";

export function syncPlacementGhost(world: UserWorld, ghostEntityId: EntityId | null, x: number, y: number): EntityId {
  if (ghostEntityId === null || !world.has(ghostEntityId, GhostPreview)) {
    const ghost = world.create();
    world.add(ghost, new Transform2D(x + HALF_BOX_SIZE, y + HALF_BOX_SIZE));
    world.add(
      ghost,
      new Shape("rectangle", BOX_SIZE, BOX_SIZE, GHOST_FILL, GHOST_STROKE, 1, Number.MAX_SAFE_INTEGER, 0),
    );
    world.add(ghost, new GhostPreview());
    return ghost;
  }

  const transform = world.get(ghostEntityId, Transform2D);
  if (!transform) {
    return ghostEntityId;
  }

  transform.curr.pos.set(x + HALF_BOX_SIZE, y + HALF_BOX_SIZE);
  transform.prev.pos.set(x + HALF_BOX_SIZE, y + HALF_BOX_SIZE);
  return ghostEntityId;
}
