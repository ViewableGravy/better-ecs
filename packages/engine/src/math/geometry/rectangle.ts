import { Vec2 } from "../vec/vec2";

export class Rectangle {
  public constructor(
    public position: Vec2,
    public size: Vec2,
  ) {}

  public static fromCenter(center: Vec2, halfExtents: Vec2): Rectangle {
    const topLeft = new Vec2(center.x - halfExtents.x, center.y - halfExtents.y);
    const size = new Vec2(halfExtents.x * 2, halfExtents.y * 2);
    return new Rectangle(topLeft, size);
  }

  public get left(): number {
    return this.position.x;
  }

  public get top(): number {
    return this.position.y;
  }

  public get right(): number {
    return this.position.x + this.size.x;
  }

  public get bottom(): number {
    return this.position.y + this.size.y;
  }

  public containsPoint(point: Vec2): boolean {
    return (
      point.x >= this.left && point.x <= this.right && point.y >= this.top && point.y <= this.bottom
    );
  }

  public intersects(other: Rectangle): boolean {
    return !(
      this.right < other.left ||
      this.left > other.right ||
      this.bottom < other.top ||
      this.top > other.bottom
    );
  }

  public translated(offset: Vec2): Rectangle {
    return new Rectangle(
      new Vec2(this.position.x + offset.x, this.position.y + offset.y),
      this.size.clone(),
    );
  }

  public clone(): Rectangle {
    return new Rectangle(this.position.clone(), this.size.clone());
  }
}
