import { Component, SerializableComponent, serializable } from "@engine";

@SerializableComponent
export class CircleCollider extends Component {
  @serializable("float")
  declare public radius: number;

  public constructor(radius: number) {
    super();
    this.radius = radius;
  }
}
