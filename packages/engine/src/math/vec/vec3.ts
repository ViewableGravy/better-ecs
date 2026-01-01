export class Vec3 {
  public constructor(
    public x: number = 0,
    public y: number = 0,
    public z: number = 0
  ) {}

  /**
   * Sets the components of this vector.
   * @param x The x component
   * @param y The y component
   * @param z The z component
   * @returns This vector for chaining
   */
  public set(x: number, y: number, z: number): this {
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  }

  /**
   * Adds another vector to this vector.
   * @param v The vector to add
   * @returns This vector for chaining
   */
  public add(v: Vec3): this {
    this.x += v.x;
    this.y += v.y;
    this.z += v.z;
    return this;
  }

  /**
   * Subtracts another vector from this vector.
   * @param v The vector to subtract
   * @returns This vector for chaining
   */
  public subtract(v: Vec3): this {
    this.x -= v.x;
    this.y -= v.y;
    this.z -= v.z;
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
    return this;
  }

  /**
   * Calculates the dot product with another vector.
   * @param v The vector to compute the dot product with
   * @returns The dot product result
   */
  public dot(v: Vec3): number {
    return this.x * v.x + this.y * v.y + this.z * v.z;
  }

  /**
   * Calculates the cross product with another vector.
   * @param v The vector to compute the cross product with
   * @returns A new Vec3 representing the cross product
   */
  public cross(v: Vec3): Vec3 {
    return new Vec3(
      this.y * v.z - this.z * v.y,
      this.z * v.x - this.x * v.z,
      this.x * v.y - this.y * v.x
    );
  }

  /**
   * Calculates the squared length of this vector.
   * @returns The squared length
   */
  public lengthSquared(): number {
    return this.x * this.x + this.y * this.y + this.z * this.z;
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
    }
    return this;
  }

  /**
   * Creates a copy of this vector.
   * @returns A new Vec3 with the same components
   */
  public clone(): Vec3 {
    return new Vec3(this.x, this.y, this.z);
  }
}
