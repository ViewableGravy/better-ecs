import { Component, Rectangle, SerializableComponent, serializable, type Vec2 } from "@engine";

type BoundsArgs = [bounds: Rectangle];
type VecArgs = [position: Vec2, size: Vec2];
type Args = BoundsArgs | VecArgs;

@SerializableComponent
export class RectangleCollider extends Component {
  @serializable("json")
  declare public bounds: Rectangle;

  public constructor(position: Vec2, size: Vec2);
  public constructor(bounds: Rectangle);
  public constructor(...args: Args) {
    super();
    if (args[0] instanceof Rectangle) {
      this.bounds = args[0];
      return;
    }

    const [position, size] = args as VecArgs;

    this.bounds = new Rectangle(position, size);
  }
}
