import { Vec2, type EntityId, type MousePoint, type UserWorld } from "@repo/engine";
import { Transform2D } from "@repo/engine/components";
import { CircleCollider, RectangleCollider, collides, getEntityCollider } from "@repo/physics";
import { Placeable } from "./components";
import { BOX_SIZE, DELETE_POINT_RADIUS, GRID_CELL_SIZE, HALF_BOX_SIZE } from "./const";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/

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

  public static deleteAt(world: UserWorld, worldPointer: MousePoint): void {
    Placement.deletePointTransform.curr.pos.set(worldPointer.x, worldPointer.y);
    Placement.deletePointTransform.prev.pos.set(worldPointer.x, worldPointer.y);

    for (const entityId of world.query(Transform2D)) {
      const transform = world.require(entityId, Transform2D);
      const collider = getEntityCollider(world, entityId);
      if (!collider) {
        continue;
      }

      if (collides(Placement.deletePointCollider, Placement.deletePointTransform, collider, transform)) {
        world.destroy(entityId);
        return;
      }
    }
  }

  public static canSpawnBox(world: UserWorld, snappedX: number, snappedY: number): boolean {
    Placement.placementTransform.curr.pos.set(snappedX + HALF_BOX_SIZE, snappedY + HALF_BOX_SIZE);
    Placement.placementTransform.prev.pos.set(snappedX + HALF_BOX_SIZE, snappedY + HALF_BOX_SIZE);

    for (const entityId of world.query(Transform2D)) {
      const transform = world.require(entityId, Transform2D);
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

  /**
   * Removes any existing transport belt at the specified position to prevent overlapping belts. Currently this relies on the placeable
   * component to identify, but most likely should use a check for a component like harvestable or something
   * that indicates that we can pick it up and put it in our inventory when we delete it.
   * 
   * In the future, we should also generally check if something is on our tile, rather than direct
   * x/y, since this may not perfectly line up if it is a multi-tile entity
   */
  public static replaceTransportBeltAt(world: UserWorld, x: number, y: number): void {
    const beltsToReplace: EntityId[] = [];

    for (const entityId of world.query(Placeable, Transform2D)) {
      const placeable = world.require(entityId, Placeable);
      if (placeable.itemType !== "transport-belt-horizontal-right") {
        continue;
      }

      const transform = world.require(entityId, Transform2D);
      if (transform.curr.pos.x !== x || transform.curr.pos.y !== y) {
        continue;
      }

      beltsToReplace.push(entityId);
    }

    for (const entityId of beltsToReplace) {
      world.destroy(entityId);
    }
  }
}

