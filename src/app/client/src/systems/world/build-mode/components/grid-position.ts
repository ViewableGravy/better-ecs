import type { GridCoordinate } from "@client/systems/world/build-mode/grid-singleton";
import { Component, StateComponent, state } from "@engine";

@StateComponent
export class GridPosition extends Component {
  @state("int")
  declare public x: GridCoordinate;

  @state("int")
  declare public y: GridCoordinate;

  public constructor(x: GridCoordinate, y: GridCoordinate) {
    super();
    this.x = x;
    this.y = y;
  }
}
