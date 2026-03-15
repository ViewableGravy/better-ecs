import { Component, SerializableComponent, serializable } from "@engine";

@SerializableComponent
export class OrbitMotion extends Component {
  @serializable("float")
  declare public radius: number;

  @serializable("float")
  declare public speedRadiansPerSecond: number;

  @serializable("float")
  declare public angleRadians: number;

  constructor(radius: number, speedRadiansPerSecond: number, angleRadians: number = 0) {
    super();
    this.radius = radius;
    this.speedRadiansPerSecond = speedRadiansPerSecond;
    this.angleRadians = angleRadians;
  }
}
