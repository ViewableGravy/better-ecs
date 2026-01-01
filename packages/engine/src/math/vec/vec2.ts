

export class Vec2 {
  public constructor(
    public x: number = 0, 
    public y: number = 0
  ) {}

  /**
   * Sets the components of this vector.
   * @param x The x component
   * @param y The y component
   * @returns This vector for chaining
   */
  public set(x: number, y: number): this {
    this.x = x;
    this.y = y;
    return this;
  }

  /**
   * Adds another vector to this vector.
   * @param v The vector to add
   * @returns This vector for chaining
   */
  public add(v: Vec2): this {
    this.x += v.x;
    this.y += v.y;
    return this;
  }

  /**
   * Subtracts another vector from this vector.
   * @param v The vector to subtract
   * @returns This vector for chaining
   */
  public subtract(v: Vec2): this {
    this.x -= v.x;
    this.y -= v.y;
    return this;
  }

  /**
   * Multiplies this vector by a scalar.
   * @param scalar The scalar to multiply by
   * @returns This vector for chaining
   */
  public scale(scalar: number): this {
    this.x *= scalar;
    this.y *= scalar;
    return this;
  }

  /**
   * Calculates the dot product with another vector.
   * @param v The vector to compute the dot product with
   * @returns The dot product result
   */
  public dot(v: Vec2): number {
    return this.x * v.x + this.y * v.y;
  }

  /**
   * Calculates the squared length of this vector.
   * @returns The squared length
   */
  public lengthSquared(): number {
    return this.x * this.x + this.y * this.y;
  }

  /**
   * Calculates the length (magnitude) of this vector.
   * @returns The length
   */
  public length(): number {
    return Math.sqrt(this.lengthSquared());
  }

  /**
   * Normalizes this vector to unit length.
   * @returns This vector for chaining
   */
  public normalize(): this {
    const len = this.length();
    if (len > 0) {
      this.x /= len;
      this.y /= len;
    }
    return this;
  }

  /**
   * Creates a copy of this vector.
   * @returns A new Vec2 with the same components
   */
  public clone(): Vec2 {
    return new Vec2(this.x, this.y);
  }
}