import type { Tagged } from "type-fest";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/
type GridCoordinate = Tagged<number, "GridCoordinate">;
type GridCoordinates = [GridCoordinate, GridCoordinate];

/**********************************************************************************************************
 *   CLASS START
 **********************************************************************************************************/
export class Grid {
  static #radius: number = 20;
  static #outlineDebugging: boolean = false;

  public static initialize() {
    return this;
  }

  public static setRadius(radius: number) {
    this.#radius = radius;
    return this;
  }

  public static setOutlineDebugging(enabled: boolean) {
    this.#outlineDebugging = enabled;
    return this;
  }

  /**
   * Returns GridCoordinates for the given world coordinates. 0,0 would the tile at 0,0 in the grid 
   */
  public static getGridIndexAtCoordinates(worldX: number, worldY: number): GridCoordinates {
    return [
      Math.floor(worldX / this.#radius) as GridCoordinate,
      Math.floor(worldY / this.#radius) as GridCoordinate,
    ];
  }

  public static getSurroundingTiles(coordinate: GridCoordinates): Array<GridCoordinates> {
    const [x, y] = coordinate;

    return [
      [x - 1 as GridCoordinate, y - 1 as GridCoordinate],
      [x     as GridCoordinate, y - 1 as GridCoordinate],
      [x + 1 as GridCoordinate, y - 1 as GridCoordinate],
      [x + 1 as GridCoordinate, y     as GridCoordinate],
      [x + 1 as GridCoordinate, y + 1 as GridCoordinate],
      [x     as GridCoordinate, y + 1 as GridCoordinate],
      [x - 1 as GridCoordinate, y + 1 as GridCoordinate],
      [x - 1 as GridCoordinate, y     as GridCoordinate],
    ];
  }

  public static get outlineDebuggingEnabled(): boolean {
    return this.#outlineDebugging;
  }

  public static get radius(): number {
    return this.#radius;
  }

}