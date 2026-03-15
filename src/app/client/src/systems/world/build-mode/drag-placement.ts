import type { TransportBeltSide } from "@client/entities/transport-belt/consts";
import { getDragPlacementMode } from "@client/systems/world/build-mode/build-items";
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
  mode: "single" | "line" | "paint";
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
    if (data.placePointerActive && getDragPlacementMode(data.selectedItem) !== null) {
      return;
    }

    this.reset(data);
  }

  public static resolvePlacementBatch(
    data: BuildModeState,
    hoveredCoordinates: GridCoordinates,
  ): DragPlacementBatch {
    const dragPlacementMode = getDragPlacementMode(data.selectedItem);

    if (!data.placePointerActive || dragPlacementMode === null) {
      return this.createBatch("single", hoveredCoordinates, [], null);
    }

    if (dragPlacementMode === "paint") {
      return this.createBatch(
        "paint",
        hoveredCoordinates,
        this.resolvePaintPlacementCandidates(data, hoveredCoordinates),
        this.getLastPlacedCoordinates(data),
      );
    }

    if (!this.hasAnchor(data)) {
      return this.createBatch(
        "line",
        hoveredCoordinates,
        this.hasVisited(data, hoveredCoordinates) ? [] : [hoveredCoordinates],
        null,
      );
    }

    const anchorCoordinates = this.getAnchorCoordinates(data);
    if (anchorCoordinates === null) {
      return this.createBatch("line", hoveredCoordinates, [], null);
    }

    const dragAxis = data.dragPlacementAxis;

    if (!this.isAlignedWithAnchor(anchorCoordinates, hoveredCoordinates, dragAxis)) {
      return this.createBatch("line", hoveredCoordinates, [], anchorCoordinates, dragAxis);
    }

    return this.createBatch(
      "line",
      hoveredCoordinates,
      this.resolveLinePlacementCandidates(data, hoveredCoordinates, dragAxis),
      anchorCoordinates,
      dragAxis,
    );
  }

  public static recordPlacement(data: BuildModeState, gridCoordinates: GridCoordinates): void {
    const dragPlacementMode = getDragPlacementMode(data.selectedItem);
    if (dragPlacementMode === null) {
      return;
    }

    if (dragPlacementMode === "paint") {
      this.recordVisitedGridKey(data, gridCoordinates);

      return;
    }

    if (!this.hasAnchor(data)) {
      const [gridX, gridY] = gridCoordinates;

      data.dragPlacementAnchorGridX = Number(gridX);
      data.dragPlacementAnchorGridY = Number(gridY);
      data.dragPlacementAxis = this.resolveAxis(data.placementEndSide);
    }

    this.recordVisitedGridKey(data, gridCoordinates);
  }

  private static recordVisitedGridKey(data: BuildModeState, gridCoordinates: GridCoordinates): void {
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
    return data.dragPlacementAnchorGridX !== null
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
    anchorCoordinates: GridCoordinates,
    hoveredCoordinates: GridCoordinates,
    dragAxis: PlacementDragAxis | null,
  ): boolean {
    const [anchorGridX, anchorGridY] = anchorCoordinates;
    const [hoveredX, hoveredY] = hoveredCoordinates;

    if (dragAxis === "horizontal") {
      return anchorGridY === Number(hoveredY);
    }

    if (dragAxis === "vertical") {
      return anchorGridX === Number(hoveredX);
    }

    return false;
  }

  private static resolveLinePlacementCandidates(
    data: BuildModeState,
    hoveredCoordinates: GridCoordinates,
    dragAxis: PlacementDragAxis | null,
  ): GridCoordinates[] {
    const [hoveredX, hoveredY] = hoveredCoordinates;
    const anchorGridX = data.dragPlacementAnchorGridX;
    const anchorGridY = data.dragPlacementAnchorGridY;

    if (anchorGridX === null || anchorGridY === null) {
      return [];
    }

    if (dragAxis === "horizontal") {
      return this.resolveAxisPlacementCandidates(data, anchorGridX, Number(hoveredX), (gridX) => {
        return this.createGridCoordinates(gridX, anchorGridY);
      });
    }

    if (dragAxis === "vertical") {
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

  private static getLastPlacedCoordinates(data: BuildModeState): GridCoordinates | null {
    const lastPlacedKey = data.dragPlacedGridKeys[data.dragPlacedGridKeys.length - 1];
    if (lastPlacedKey === undefined) {
      return null;
    }

    const [gridX, gridY] = lastPlacedKey.split(":").map(Number);
    if (!Number.isInteger(gridX) || !Number.isInteger(gridY)) {
      return null;
    }

    return this.createGridCoordinates(gridX, gridY);
  }

  private static createBatch(
    mode: DragPlacementBatch["mode"],
    hoveredCoordinates: GridCoordinates,
    candidates: GridCoordinates[],
    anchor: GridCoordinates | null,
    axis: PlacementDragAxis | null = null,
  ): DragPlacementBatch {
    return {
      mode,
      axis,
      anchor,
      hovered: hoveredCoordinates,
      candidates,
    };
  }

  private static resolvePaintPlacementCandidates(
    data: BuildModeState,
    hoveredCoordinates: GridCoordinates,
  ): GridCoordinates[] {
    const lastPlacedCoordinates = this.getLastPlacedCoordinates(data);
    if (lastPlacedCoordinates === null) {
      return this.hasVisited(data, hoveredCoordinates) ? [] : [hoveredCoordinates];
    }

    return this.resolveSegmentPlacementCandidates(data, lastPlacedCoordinates, hoveredCoordinates);
  }

  private static resolveSegmentPlacementCandidates(
    data: BuildModeState,
    startCoordinates: GridCoordinates,
    endCoordinates: GridCoordinates,
  ): GridCoordinates[] {
    const startX = Number(startCoordinates[0]);
    const startY = Number(startCoordinates[1]);
    const endX = Number(endCoordinates[0]);
    const endY = Number(endCoordinates[1]);

    const deltaX = Math.abs(endX - startX);
    const deltaY = Math.abs(endY - startY);
    const stepX = startX < endX ? 1 : -1;
    const stepY = startY < endY ? 1 : -1;

    let currentX = startX;
    let currentY = startY;
    let error = deltaX - deltaY;

    const candidates: GridCoordinates[] = [];

    while (true) {
      const candidate = this.createGridCoordinates(currentX, currentY);

      if (!this.hasVisited(data, candidate)) {
        candidates.push(candidate);
      }

      if (currentX === endX && currentY === endY) {
        return candidates;
      }

      const doubledError = error * 2;

      if (doubledError > -deltaY) {
        error -= deltaY;
        currentX += stepX;
      }

      if (doubledError < deltaX) {
        error += deltaX;
        currentY += stepY;
      }
    }
  }

  private static toGridKey(gridCoordinates: GridCoordinates): string {
    const [gridX, gridY] = gridCoordinates;

    return `${Number(gridX)}:${Number(gridY)}`;
  }
}