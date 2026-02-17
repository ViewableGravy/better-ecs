import { TransformState2D } from "../transform/transform2d";

/**
 * Local transform offset relative to a parent entity.
 *
 * Mirrors `Transform2D` by keeping `curr` and `prev` states so interpolation
 * can be applied when deriving world-space transforms.
 */
export class LocalTransform2D {
  public curr: TransformState2D;
  public prev: TransformState2D;

  constructor(
    x: number = 0,
    y: number = 0,
    rotation: number = 0,
    scaleX: number = 1,
    scaleY: number = 1,
  ) {
    this.curr = new TransformState2D(x, y, rotation, scaleX, scaleY);
    this.prev = new TransformState2D(x, y, rotation, scaleX, scaleY);
  }
}
