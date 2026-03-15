import { Serializable, serializable } from "@engine";

export class CircleCollider extends Serializable {
  @serializable("float")
  public radius: number;

  public constructor(radius: number) {
    super();
    this.radius = radius;
  }
}
