import { Component } from "@engine";
export class OrbitMotion extends Component {
  declare public radius: number;
  declare public speedRadiansPerSecond: number;
  declare public angleRadians: number;

  constructor(radius: number, speedRadiansPerSecond: number, angleRadians: number = 0) {
    super();
    this.radius = radius;
    this.speedRadiansPerSecond = speedRadiansPerSecond;
    this.angleRadians = angleRadians;
  }
}
