import { RenderVisibility, type RenderVisibilityRole } from "@/scenes/spatial-contexts-demo/components/render-visibility";
import { Vec2, type UserWorld } from "@repo/engine";
import { Shape, Transform2D } from "@repo/engine/components";
import { CircleCollider, RectangleCollider, collides, getEntityCollider } from "@repo/physics";
import { GridFootprint, GridPosition, Placeable } from "./components";
import { BOX_SIZE, DELETE_POINT_RADIUS, GRID_CELL_SIZE, HALF_BOX_SIZE, PLACED_FILL, PLACED_STROKE } from "./const";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/

type SpawnBoxArgs = {
  world: UserWorld;
  snappedX: number;
  snappedY: number;
  renderVisibilityRole: RenderVisibilityRole;
};

type DeleteAtArgs = {
  world: UserWorld;
  worldX: number;
  worldY: number;
};

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export class Placement {
  private static readonly placementCollider = new RectangleCollider(
    new Vec2(-HALF_BOX_SIZE, -HALF_BOX_SIZE),
    new Vec2(BOX_SIZE, BOX_SIZE),
  );

  private static readonly placementTransform = new Transform2D(0, 0);
  private static readonly deletePointCollider = new CircleCollider(DELETE_POINT_RADIUS);
  private static readonly deletePointTransform = new Transform2D(0, 0);

  public static snapToGrid(value: number): number {
    return Math.floor(value / GRID_CELL_SIZE) * GRID_CELL_SIZE;
  }

  public static deleteAt(args: DeleteAtArgs): void {
    const { world, worldX, worldY } = args;

    Placement.deletePointTransform.curr.pos.set(worldX, worldY);
    Placement.deletePointTransform.prev.pos.set(worldX, worldY);

    for (const entityId of world.query(Transform2D)) {
      const transform = world.get(entityId, Transform2D);
      if (!transform) {
        continue;
      }

      const collider = getEntityCollider(world, entityId);
      if (!collider) {
        continue;
      }

      if (!collides(Placement.deletePointCollider, Placement.deletePointTransform, collider, transform)) {
        continue;
      }

      world.destroy(entityId);
      return;
    }
  }

  public static spawnBox(args: SpawnBoxArgs): void {
    const { world, snappedX, snappedY, renderVisibilityRole } = args;

    if (!Placement.canSpawnBox(world, snappedX, snappedY)) {
      return;
    }

    const placed = world.create();
    world.add(placed, new Transform2D(snappedX + HALF_BOX_SIZE, snappedY + HALF_BOX_SIZE));
    world.add(placed, new Shape("rectangle", BOX_SIZE, BOX_SIZE, PLACED_FILL, PLACED_STROKE, 1));
    world.add(
      placed,
      new RectangleCollider(new Vec2(-HALF_BOX_SIZE, -HALF_BOX_SIZE), new Vec2(BOX_SIZE, BOX_SIZE)),
    );
    world.add(placed, new GridPosition(snappedX, snappedY));
    world.add(placed, new GridFootprint(BOX_SIZE, BOX_SIZE));
    world.add(placed, new Placeable("box"));
    world.add(placed, new RenderVisibility(renderVisibilityRole, 1));
  }

  private static canSpawnBox(world: UserWorld, snappedX: number, snappedY: number): boolean {
    Placement.placementTransform.curr.pos.set(snappedX + HALF_BOX_SIZE, snappedY + HALF_BOX_SIZE);
    Placement.placementTransform.prev.pos.set(snappedX + HALF_BOX_SIZE, snappedY + HALF_BOX_SIZE);

    for (const entityId of world.query(Transform2D)) {
      const transform = world.get(entityId, Transform2D);
      if (!transform) {
        continue;
      }

      const collider = getEntityCollider(world, entityId);
      if (!collider) {
        continue;
      }

      if (collides(Placement.placementCollider, Placement.placementTransform, collider, transform)) {
        return false;
      }
    }

    return true;
  }
}
