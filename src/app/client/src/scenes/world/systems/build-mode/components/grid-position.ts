import type { GridCoordinate } from "@client/scenes/world/systems/build-mode/grid-singleton";

export class GridPosition {
  public constructor(
    public x: GridCoordinate,
    public y: GridCoordinate,
  ) {}
}
