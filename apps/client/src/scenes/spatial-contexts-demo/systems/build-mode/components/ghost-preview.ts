import type { EntityId, UserWorld } from "@repo/engine";
import { Shape, Transform2D } from "@repo/engine/components";
import { BOX_SIZE, GHOST_FILL, GHOST_STROKE, HALF_BOX_SIZE } from "../const";

export class GhostPreview {
  /**
   * Spawns a new ghost preview entity at the specified position
   */
  public static spawn(world: UserWorld, x: number, y: number): EntityId {
    const ghost = world.create();
    world.add(ghost, new Transform2D(x + HALF_BOX_SIZE, y + HALF_BOX_SIZE));
    world.add(
      ghost,
      new Shape("rectangle", BOX_SIZE, BOX_SIZE, GHOST_FILL, GHOST_STROKE, 1, Number.MAX_SAFE_INTEGER, 0),
    );
    world.add(ghost, new GhostPreview());
    return ghost;
  }

  /**
   * Syncs an existing ghost entity or creates a new one if needed
   */
  public static sync(world: UserWorld, ghostEntityId: EntityId | null, x: number, y: number): EntityId {
    if (ghostEntityId === null || !world.has(ghostEntityId, GhostPreview)) {
      return GhostPreview.spawn(world, x, y);
    }

    const transform = world.require(ghostEntityId, Transform2D);
    
    // Set both curr and prev to prevent interpolation between grid squares
    transform.curr.pos.set(x + HALF_BOX_SIZE, y + HALF_BOX_SIZE);
    transform.prev.pos.set(x + HALF_BOX_SIZE, y + HALF_BOX_SIZE);
    return ghostEntityId;
  }
}
