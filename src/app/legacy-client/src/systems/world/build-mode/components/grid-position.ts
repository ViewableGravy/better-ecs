import type { GridCoordinate } from "@legacy/systems/world/build-mode/grid-singleton";
import { Component } from "@engine";
export class GridPosition extends Component {
  declare public x: GridCoordinate;
  declare public y: GridCoordinate;

  public constructor(x: GridCoordinate, y: GridCoordinate) {
    super();
    this.x = x;
    this.y = y;
  }
}
