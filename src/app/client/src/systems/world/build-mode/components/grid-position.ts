import type { GridCoordinate } from "@client/systems/world/build-mode/grid-singleton";

export class GridPosition {
  public constructor(
    public x: GridCoordinate,
    public y: GridCoordinate,
  ) {}
}
