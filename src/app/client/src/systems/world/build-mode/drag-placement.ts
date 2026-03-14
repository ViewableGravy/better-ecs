import type { TransportBeltSide } from "@client/entities/transport-belt/consts";
import { supportsLineDragPlacement } from "@client/systems/world/build-mode/build-items";
import type {
    BuildModeState,
    PlacementDragAxis,
} from "@client/systems/world/build-mode/const";
import {
    GridSingleton,
    type GridCoordinates,
} from "@client/systems/world/build-mode/grid-singleton";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/

export type DragPlacementBatch = {
  mode: "single" | "line";
  axis: PlacementDragAxis | null;
  anchor: GridCoordinates | null;
  hovered: GridCoordinates;
  candidates: GridCoordinates[];
};

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export class BuildModeDragPlacement {
  public static syncSession(data: BuildModeState): void {
    if (data.placePointerActive && supportsLineDragPlacement(data.selectedItem)) {
      return;
    }

    this.reset(data);
  }

  public static resolvePlacementBatch(
    data: BuildModeState,
    hoveredCoordinates: GridCoordinates,
  ): DragPlacementBatch {
    if (!data.placePointerActive || !supportsLineDragPlacement(data.selectedItem)) {
      return this.createBatch(hoveredCoordinates, [], null);
    }

    if (!this.hasAnchor(data)) {
      return this.createBatch(
        hoveredCoordinates,
        this.hasVisited(data, hoveredCoordinates) ? [] : [hoveredCoordinates],
        null,
      );
    }

    if (!this.isAlignedWithAnchor(data, hoveredCoordinates)) {
      return this.createBatch(hoveredCoordinates, [], this.getAnchorCoordinates(data));
    }

    return this.createBatch(
      hoveredCoordinates,
      this.resolveLinePlacementCandidates(data, hoveredCoordinates),
      this.getAnchorCoordinates(data),
    );
  }

  public static recordPlacement(data: BuildModeState, gridCoordinates: GridCoordinates): void {
    if (!supportsLineDragPlacement(data.selectedItem)) {
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

  private static getAnchorCoordinates(data: BuildModeState): GridCoordinates | null {
    const anchorGridX = data.dragPlacementAnchorGridX;
    const anchorGridY = data.dragPlacementAnchorGridY;

    if (anchorGridX === null || anchorGridY === null) {
      return null;
    }

    return this.createGridCoordinates(anchorGridX, anchorGridY);
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

  private static resolveLinePlacementCandidates(
    data: BuildModeState,
    hoveredCoordinates: GridCoordinates,
  ): GridCoordinates[] {
    const [hoveredX, hoveredY] = hoveredCoordinates;
    const anchorGridX = data.dragPlacementAnchorGridX;
    const anchorGridY = data.dragPlacementAnchorGridY;

    if (anchorGridX === null || anchorGridY === null) {
      return [];
    }

    if (data.dragPlacementAxis === "horizontal") {
      return this.resolveAxisPlacementCandidates(data, anchorGridX, Number(hoveredX), (gridX) => {
        return this.createGridCoordinates(gridX, anchorGridY);
      });
    }

    if (data.dragPlacementAxis === "vertical") {
      return this.resolveAxisPlacementCandidates(data, anchorGridY, Number(hoveredY), (gridY) => {
        return this.createGridCoordinates(anchorGridX, gridY);
      });
    }

    return [];
  }

  private static resolveAxisPlacementCandidates(
    data: BuildModeState,
    anchorIndex: number,
    hoveredIndex: number,
    createCoordinates: (coordinateIndex: number) => GridCoordinates,
  ): GridCoordinates[] {
    const direction = Math.sign(hoveredIndex - anchorIndex);

    if (direction === 0) {
      const candidate = createCoordinates(anchorIndex);

      return this.hasVisited(data, candidate) ? [] : [candidate];
    }

    const candidates: GridCoordinates[] = [];

    for (
      let coordinateIndex = anchorIndex + direction;
      coordinateIndex !== hoveredIndex + direction;
      coordinateIndex += direction
    ) {
      const candidate = createCoordinates(coordinateIndex);

      if (this.hasVisited(data, candidate)) {
        continue;
      }

      candidates.push(candidate);
    }

    return candidates;
  }

  private static createGridCoordinates(gridX: number, gridY: number): GridCoordinates {
    return GridSingleton.worldToGridCoordinates(
      gridX * GridSingleton.cellSize,
      gridY * GridSingleton.cellSize,
    );
  }

  private static createBatch(
    hoveredCoordinates: GridCoordinates,
    candidates: GridCoordinates[],
    anchor: GridCoordinates | null,
  ): DragPlacementBatch {
    return {
      mode: "line",
      axis: anchor === null ? null : this.resolveBatchAxis(anchor, hoveredCoordinates),
      anchor,
      hovered: hoveredCoordinates,
      candidates,
    };
  }

  private static resolveBatchAxis(
    anchor: GridCoordinates,
    hoveredCoordinates: GridCoordinates,
  ): PlacementDragAxis | null {
    if (anchor[0] === hoveredCoordinates[0]) {
      return "vertical";
    }

    if (anchor[1] === hoveredCoordinates[1]) {
      return "horizontal";
    }

    return null;
  }

  private static toGridKey(gridCoordinates: GridCoordinates): string {
    const [gridX, gridY] = gridCoordinates;

    return `${Number(gridX)}:${Number(gridY)}`;
  }
}