import { Vec2 } from "../../math/vec/vec2";

export class TransformState2D {
  public pos: Vec2;
  public rotation: number;
  public scale: Vec2;

  constructor(x: number = 0, y: number = 0, rotation: number = 0, scaleX: number = 1, scaleY: number = 1) {
    this.pos = new Vec2(x, y);
    this.rotation = rotation;
    this.scale = new Vec2(scaleX, scaleY);
  }

  public copyFrom(other: TransformState2D): void {
    this.pos.set(other.pos.x, other.pos.y);
    this.rotation = other.rotation;
    this.scale.set(other.scale.x, other.scale.y);
  }
}

export class Transform2D {
  public curr: TransformState2D;
  public prev: TransformState2D;

  constructor(x: number = 0, y: number = 0, rotation: number = 0, scaleX: number = 1, scaleY: number = 1) {
    this.curr = new TransformState2D(x, y, rotation, scaleX, scaleY);
    this.prev = new TransformState2D(x, y, rotation, scaleX, scaleY);
  }
}
