import { Placeable } from "@client/scenes/world/systems/build-mode/components";
import { BOX_SIZE, DELETE_POINT_RADIUS, HALF_BOX_SIZE } from "@client/scenes/world/systems/build-mode/const";
import {
  GridSingleton,
  type GridCoordinates,
} from "@client/scenes/world/systems/build-mode/grid-singleton";
import { Vec2, type EntityId, type MousePoint, type UserWorld } from "@engine";
import { Transform2D } from "@engine/components";
import { CircleCollider, RectangleCollider, collides, getEntityCollider } from "@libs/physics";

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

  public static canSpawnBox(world: UserWorld, gridCoordinates: GridCoordinates): boolean {
    const [tileCenterX, tileCenterY] = GridSingleton.gridCoordinatesToWorldCenter(gridCoordinates);

    Placement.placementTransform.curr.pos.set(tileCenterX, tileCenterY);
    Placement.placementTransform.prev.pos.set(tileCenterX, tileCenterY);

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
    const targetCoordinates = GridSingleton.worldToGridCoordinates(x, y);

    for (const entityId of world.query(Placeable, Transform2D)) {
      const placeable = world.require(entityId, Placeable);
      if (placeable.itemType !== "transport-belt-horizontal-right") {
        continue;
      }

      const transform = world.require(entityId, Transform2D);
      const beltCoordinates = GridSingleton.worldToGridCoordinates(
        transform.curr.pos.x,
        transform.curr.pos.y,
      );

      if (!GridSingleton.areCoordinatesEqual(targetCoordinates, beltCoordinates)) {
        continue;
      }

      beltsToReplace.push(entityId);
    }

    for (const entityId of beltsToReplace) {
      world.destroy(entityId);
    }
  }
}

