import { Transform2D } from "@engine/components/transform/transform2d";
import { serializable } from "@engine/serialization";

export class ShaderTransform2D extends Transform2D {
  @serializable("float")
  public width: number;

  @serializable("float")
  public height: number;

  @serializable("float")
  public anchorX: number;

  @serializable("float")
  public anchorY: number;

  constructor(
    x: number = 0,
    y: number = 0,
    width: number = 128,
    height: number = 128,
    rotation: number = 0,
    scaleX: number = 1,
    scaleY: number = 1,
    anchorX: number = 0.5,
    anchorY: number = 0.5,
  ) {
    super(x, y, rotation, scaleX, scaleY);
    this.width = width;
    this.height = height;
    this.anchorX = anchorX;
    this.anchorY = anchorY;
  }
}