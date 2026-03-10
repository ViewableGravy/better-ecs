import type { GridCoordinates } from "@client/systems/world/build-mode/grid-singleton";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/

export type PlacementFootprint = {
  width: number;
  height: number;
};

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export class PlacementFootprintUtils {
  public static readonly unit: PlacementFootprint = {
    width: 1,
    height: 1,
  };

  public static resolveFootprintCoordinates(origin: GridCoordinates, footprint: PlacementFootprint): GridCoordinates[] {
    const [originX, originY] = origin;
    const coordinates: GridCoordinates[] = [];

    for (let offsetY = 0; offsetY < footprint.height; offsetY += 1) {
      for (let offsetX = 0; offsetX < footprint.width; offsetX += 1) {
        // Tagged grid coordinates require an explicit cast when deriving adjacent cells arithmetically.
        coordinates.push([
          (Number(originX) + offsetX) as GridCoordinates[0],
          (Number(originY) + offsetY) as GridCoordinates[1],
        ]);
      }
    }

    return coordinates;
  }
}