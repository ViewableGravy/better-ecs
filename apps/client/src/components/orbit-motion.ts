export class OrbitMotion {
  constructor(
    public radius: number,
    public speedRadiansPerSecond: number,
    public angleRadians: number = 0,
  ) {}
}
