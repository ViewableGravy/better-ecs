import type { GridCoordinate } from "@client/systems/world/build-mode/grid-singleton";
import { Serializable, serializable } from "@engine";

export class GridPosition extends Serializable {
  @serializable("int")
  public x: GridCoordinate;

  @serializable("int")
  public y: GridCoordinate;

  public constructor(x: GridCoordinate, y: GridCoordinate) {
    super();
    this.x = x;
    this.y = y;
  }
}
