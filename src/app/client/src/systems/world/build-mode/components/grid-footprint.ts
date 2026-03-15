import { Component, SerializableComponent, serializable } from "@engine";

@SerializableComponent
export class GridFootprint extends Component {
  @serializable("float")
  declare public width: number;

  @serializable("float")
  declare public height: number;

  public constructor(width: number, height: number) {
    super();
    this.width = width;
    this.height = height;
  }
}
