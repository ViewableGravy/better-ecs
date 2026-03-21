import { Component, StateComponent, state } from "@engine";

@StateComponent
export class OrbitMotion extends Component {
  @state("float")
  declare public radius: number;

  @state("float")
  declare public speedRadiansPerSecond: number;

  @state("float")
  declare public angleRadians: number;

  constructor(radius: number, speedRadiansPerSecond: number, angleRadians: number = 0) {
    super();
    this.radius = radius;
    this.speedRadiansPerSecond = speedRadiansPerSecond;
    this.angleRadians = angleRadians;
  }
}
