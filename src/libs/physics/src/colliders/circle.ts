import { Component } from "@engine";
export class CircleCollider extends Component {
  declare public radius: number;

  public constructor(radius: number) {
    super();
    this.radius = radius;
  }
}
