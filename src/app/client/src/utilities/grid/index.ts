import type { Tagged } from "type-fest";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/
type GridCoordinate = Tagged<number, "GridCoordinate">;
type GridCoordinates = [GridCoordinate, GridCoordinate];
type WorldCoordinates = readonly [number, number];

/**********************************************************************************************************
 *   CONSTS
 **********************************************************************************************************/
const SQRT_3 = Math.sqrt(3);

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
    const scaledX = worldX / this.#radius;
    const scaledY = worldY / this.#radius;
    const fractionalQ = (2 / 3) * scaledX;
    const fractionalR = (-1 / 3) * scaledX + (SQRT_3 / 3) * scaledY;
    const fractionalS = -fractionalQ - fractionalR;
    let q = Math.round(fractionalQ);
    let r = Math.round(fractionalR);
    const s = Math.round(fractionalS);
    const qDifference = Math.abs(q - fractionalQ);
    const rDifference = Math.abs(r - fractionalR);
    const sDifference = Math.abs(s - fractionalS);

    if (qDifference > rDifference && qDifference > sDifference) {
      q = -r - s;
    } else if (rDifference > sDifference) {
      r = -q - s;
    }

    return [
      q as GridCoordinate,
      r as GridCoordinate,
    ];
  }

  public static getWorldCoordinates(gridX: number, gridY: number): WorldCoordinates {
    return [
      this.#radius * 1.5 * gridX,
      this.#radius * SQRT_3 * (gridX * 0.5 + gridY),
    ];
  }

  public static getSurroundingTiles(coordinate: GridCoordinates): Array<GridCoordinates> {
    const [x, y] = coordinate;

    return [
      [x + 1 as GridCoordinate, y     as GridCoordinate],
      [x + 1 as GridCoordinate, y - 1 as GridCoordinate],
      [x     as GridCoordinate, y - 1 as GridCoordinate],
      [x - 1 as GridCoordinate, y     as GridCoordinate],
      [x - 1 as GridCoordinate, y + 1 as GridCoordinate],
      [x     as GridCoordinate, y + 1 as GridCoordinate],
    ];
  }

  public static get outlineDebuggingEnabled(): boolean {
    return this.#outlineDebugging;
  }

  public static get radius(): number {
    return this.#radius;
  }

}