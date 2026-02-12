import { Vec3 } from "../../math/vec/vec3";

export class TransformState3D {
  public pos: Vec3;
  // Euler angles
  public rotation: Vec3;
  public scale: Vec3;

  constructor(x: number = 0, y: number = 0, z: number = 0, rotX: number = 0, rotY: number = 0, rotZ: number = 0, scaleX: number = 1, scaleY: number = 1, scaleZ: number = 1) {
    this.pos = new Vec3(x, y, z);
    this.rotation = new Vec3(rotX, rotY, rotZ);
    this.scale = new Vec3(scaleX, scaleY, scaleZ);
  }

  public copyFrom(other: TransformState3D): void {
    this.pos.set(other.pos.x, other.pos.y, other.pos.z);
    this.rotation.set(other.rotation.x, other.rotation.y, other.rotation.z);
    this.scale.set(other.scale.x, other.scale.y, other.scale.z);
  }
}

export class Transform3D {
  public curr: TransformState3D;
  public prev: TransformState3D;

  constructor(x: number = 0, y: number = 0, z: number = 0, rotationX: number = 0, rotationY: number = 0, rotationZ: number = 0, scaleX: number = 1, scaleY: number = 1, scaleZ: number = 1) {
    this.curr = new TransformState3D(x, y, z, rotationX, rotationY, rotationZ, scaleX, scaleY, scaleZ);
    this.prev = new TransformState3D(x, y, z, rotationX, rotationY, rotationZ, scaleX, scaleY, scaleZ);
  }
}
