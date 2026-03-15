import { Serializable, serializable } from "@engine";

export class GridFootprint extends Serializable {
  @serializable("float")
  public width: number;

  @serializable("float")
  public height: number;

  public constructor(width: number, height: number) {
    super();
    this.width = width;
    this.height = height;
  }
}
