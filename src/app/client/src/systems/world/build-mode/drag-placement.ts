import type { TransportBeltSide } from "@client/entities/transport-belt/consts";
import type {
  BuildModeState,
  PlacementDragAxis,
} from "@client/systems/world/build-mode/const";
import type { GridCoordinates } from "@client/systems/world/build-mode/grid-singleton";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export class BuildModeDragPlacement {
  public static syncSession(data: BuildModeState): void {
    if (data.placePointerActive && data.selectedItem === "transport-belt") {
      return;
    }

    this.reset(data);
  }

  public static resolvePlacementCandidates(
    data: BuildModeState,
    hoveredCoordinates: GridCoordinates,
  ): GridCoordinates[] {
    if (!data.placePointerActive || data.selectedItem !== "transport-belt") {
      return [];
    }

    if (!this.hasAnchor(data)) {
      return this.hasVisited(data, hoveredCoordinates) ? [] : [hoveredCoordinates];
    }

    if (!this.isAlignedWithAnchor(data, hoveredCoordinates)) {
      return [];
    }

    return this.hasVisited(data, hoveredCoordinates) ? [] : [hoveredCoordinates];
  }

  public static recordPlacement(data: BuildModeState, gridCoordinates: GridCoordinates): void {
    if (data.selectedItem !== "transport-belt") {
      return;
    }

    if (!this.hasAnchor(data)) {
      const [gridX, gridY] = gridCoordinates;

      data.dragPlacementAxis = this.resolveAxis(data.placementEndSide);
      data.dragPlacementAnchorGridX = Number(gridX);
      data.dragPlacementAnchorGridY = Number(gridY);
    }

    const key = this.toGridKey(gridCoordinates);

    if (data.dragPlacedGridKeys.includes(key)) {
      return;
    }

    data.dragPlacedGridKeys.push(key);
  }

  public static reset(data: BuildModeState): void {
    data.dragPlacementAxis = null;
    data.dragPlacementAnchorGridX = null;
    data.dragPlacementAnchorGridY = null;
    data.dragPlacedGridKeys.length = 0;
  }

  private static hasAnchor(data: BuildModeState): boolean {
    return data.dragPlacementAxis !== null
      && data.dragPlacementAnchorGridX !== null
      && data.dragPlacementAnchorGridY !== null;
  }

  private static hasVisited(data: BuildModeState, gridCoordinates: GridCoordinates): boolean {
    return data.dragPlacedGridKeys.includes(this.toGridKey(gridCoordinates));
  }

  private static resolveAxis(endSide: TransportBeltSide): PlacementDragAxis {
    if (endSide === "left" || endSide === "right") {
      return "horizontal";
    }

    return "vertical";
  }

  private static isAlignedWithAnchor(
    data: BuildModeState,
    hoveredCoordinates: GridCoordinates,
  ): boolean {
    const [hoveredX, hoveredY] = hoveredCoordinates;
    const anchorGridX = data.dragPlacementAnchorGridX;
    const anchorGridY = data.dragPlacementAnchorGridY;

    if (anchorGridX === null || anchorGridY === null) {
      return false;
    }

    if (data.dragPlacementAxis === "horizontal") {
      return anchorGridY === Number(hoveredY);
    }

    if (data.dragPlacementAxis === "vertical") {
      return anchorGridX === Number(hoveredX);
    }

    return false;
  }

  private static toGridKey(gridCoordinates: GridCoordinates): string {
    const [gridX, gridY] = gridCoordinates;

    return `${Number(gridX)}:${Number(gridY)}`;
  }
}