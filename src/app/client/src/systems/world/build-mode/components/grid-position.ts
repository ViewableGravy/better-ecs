import type { GridCoordinate } from "@client/systems/world/build-mode/grid-singleton";
import { Component, SerializableComponent, serializable } from "@engine";

@SerializableComponent
export class GridPosition extends Component {
  @serializable("int")
  declare public x: GridCoordinate;

  @serializable("int")
  declare public y: GridCoordinate;

  public constructor(x: GridCoordinate, y: GridCoordinate) {
    super();
    this.x = x;
    this.y = y;
  }
}
