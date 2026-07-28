export class Vec4 {
  public constructor(
    public x: number = 0,
    public y: number = 0,
    public z: number = 0,
    public w: number = 0
  ) {}

  /**
   * Sets the components of this vector.
   * @param x The x component
   * @param y The y component
   * @param z The z component
   * @param w The w component
   * @returns This vector for chaining
   */
  public set(x: number, y: number, z: number, w: number): this {
    this.x = x;
    this.y = y;
    this.z = z;
    this.w = w;
    return this;
  }

  /**
   * Adds another vector to this vector.
   * @param v The vector to add
   * @returns This vector for chaining
   */
  public add(v: Vec4): this {
    this.x += v.x;
    this.y += v.y;
    this.z += v.z;
    this.w += v.w;
    return this;
  }

  /**
   * Subtracts another vector from this vector.
   * @param v The vector to subtract
   * @returns This vector for chaining
   */
  public subtract(v: Vec4): this {
    this.x -= v.x;
    this.y -= v.y;
    this.z -= v.z;
    this.w -= v.w;
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
    this.z *= scalar;
    this.w *= scalar;
    return this;
  }

  /**
   * Calculates the dot product with another vector.
   * @param v The vector to compute the dot product with
   * @returns The dot product result
   */
  public dot(v: Vec4): number {
    return this.x * v.x + this.y * v.y + this.z * v.z + this.w * v.w;
  }

  /**
   * Calculates the squared length of this vector.
   * @returns The squared length
   */
  public lengthSquared(): number {
    return this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w;
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
      this.z /= len;
      this.w /= len;
    }
    return this;
  }

  /**
   * Creates a copy of this vector.
   * @returns A new Vec4 with the same components
   */
  public clone(): Vec4 {
    return new Vec4(this.x, this.y, this.z, this.w);
  }
}
