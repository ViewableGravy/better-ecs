import { Component } from "@engine";
export class GridFootprint extends Component {
  declare public width: number;
  declare public height: number;

  public constructor(width: number, height: number) {
    super();
    this.width = width;
    this.height = height;
  }
}
