import { Transform2D } from "./transform2d";

export class ShaderTransform2D extends Transform2D {
  public width: number;
  public height: number;
  public anchorX: number;
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