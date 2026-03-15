import { Serializable, serializable } from "@engine";

export class OrbitMotion extends Serializable {
  @serializable("float")
  public radius: number;

  @serializable("float")
  public speedRadiansPerSecond: number;

  @serializable("float")
  public angleRadians: number;

  constructor(radius: number, speedRadiansPerSecond: number, angleRadians: number = 0) {
    super();
    this.radius = radius;
    this.speedRadiansPerSecond = speedRadiansPerSecond;
    this.angleRadians = angleRadians;
  }
}
