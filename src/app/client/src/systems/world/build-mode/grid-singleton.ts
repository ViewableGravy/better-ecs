import type { EntityId, UserWorld } from "@engine";
import { Transform2D } from "@engine/components";
import type { Tagged } from "type-fest";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/
export type GridCoordinate = Tagged<number, "GridCoordinate">;
export type GridCoordinates = [x: GridCoordinate, y: GridCoordinate];

type WorldCoordinates = [x: number, y: number];

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/
export class GridSingleton {
  public static readonly originX = 0;
  public static readonly originY = 0;
  public static readonly cellSize = 20;
  public static readonly halfCellSize = GridSingleton.cellSize / 2;

  public static worldToGridCoordinates(worldX: number, worldY: number): GridCoordinates {
    return [
      GridSingleton.worldToGridCoordinate(worldX),
      GridSingleton.worldToGridCoordinate(worldY),
    ];
  }

  public static worldToTileCenter(worldX: number, worldY: number): WorldCoordinates {
    const coordinates = GridSingleton.worldToGridCoordinates(worldX, worldY);
    return GridSingleton.gridCoordinatesToWorldCenter(coordinates);
  }

  public static gridCoordinatesToWorldCenter(coordinates: GridCoordinates): WorldCoordinates {
    return [
      Number(coordinates[0]) * GridSingleton.cellSize + GridSingleton.originX,
      Number(coordinates[1]) * GridSingleton.cellSize + GridSingleton.originY,
    ];
  }

  public static gridCoordinatesToWorldOrigin(coordinates: GridCoordinates): WorldCoordinates {
    const [centerX, centerY] = GridSingleton.gridCoordinatesToWorldCenter(coordinates);
    return [
      centerX - GridSingleton.halfCellSize,
      centerY - GridSingleton.halfCellSize,
    ];
  }

  public static getEntityAtGridCoordinates(
    world: UserWorld,
    coordinates: GridCoordinates,
  ): EntityId | undefined {
    for (const entityId of world.query(Transform2D)) {
      const transform = world.require(entityId, Transform2D);
      const transformCoordinates = GridSingleton.worldToGridCoordinates(
        transform.curr.pos.x,
        transform.curr.pos.y,
      );

      if (!GridSingleton.areCoordinatesEqual(coordinates, transformCoordinates)) {
        continue;
      }

      return entityId;
    }

    return undefined;
  }

  public static areCoordinatesEqual(a: GridCoordinates, b: GridCoordinates): boolean {
    return a[0] === b[0] && a[1] === b[1];
  }

  private static worldToGridCoordinate(value: number): GridCoordinate {
    const index = Math.floor((value + GridSingleton.halfCellSize) / GridSingleton.cellSize);

    // Tagged numbers require an explicit cast to preserve nominal typing at compile time.
    return index as GridCoordinate;
  }
}
