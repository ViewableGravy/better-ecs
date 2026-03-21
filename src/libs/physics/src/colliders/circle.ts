import { Component, StateComponent, state } from "@engine";

@StateComponent
export class CircleCollider extends Component {
  @state("float")
  declare public radius: number;

  public constructor(radius: number) {
    super();
    this.radius = radius;
  }
}
