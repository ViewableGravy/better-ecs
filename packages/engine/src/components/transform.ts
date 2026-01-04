import { Vec3 } from "../math/vec/vec3";

export class Transform {
  public curr: Vec3;
  public prev: Vec3;

  constructor(x: number = 0, y: number = 0, z: number = 0) {
    this.curr = new Vec3(x, y, z);
    this.prev = new Vec3(x, y, z);
  }
}
