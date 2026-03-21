import { Component, StateComponent, state } from "@engine";

@StateComponent
export class GridFootprint extends Component {
  @state("float")
  declare public width: number;

  @state("float")
  declare public height: number;

  public constructor(width: number, height: number) {
    super();
    this.width = width;
    this.height = height;
  }
}
