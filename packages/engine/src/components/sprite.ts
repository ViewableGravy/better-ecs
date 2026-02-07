import { Texture } from "../texture";

export class Color {
  constructor(
    public r: number = 1,
    public g: number = 1,
    public b: number = 1,
    public a: number = 1
  ) {}

  public set(r: number, g: number, b: number, a: number = 1): this {
    this.r = r;
    this.g = g;
    this.b = b;
    this.a = a;
    return this;
  }

  public copyFrom(other: Color): void {
    this.r = other.r;
    this.g = other.g;
    this.b = other.b;
    this.a = other.a;
  }

  /** Convert to CSS rgba string */
  public toRgba(): string {
    const r = Math.round(this.r * 255);
    const g = Math.round(this.g * 255);
    const b = Math.round(this.b * 255);
    return `rgba(${r}, ${g}, ${b}, ${this.a})`;
  }

  /** Convert to hex string (ignores alpha) */
  public toHex(): string {
    const r = Math.round(this.r * 255).toString(16).padStart(2, '0');
    const g = Math.round(this.g * 255).toString(16).padStart(2, '0');
    const b = Math.round(this.b * 255).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
  }

  /** Create from hex string */
  public static fromHex(hex: string): Color {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return new Color();
    return new Color(
      parseInt(result[1], 16) / 255,
      parseInt(result[2], 16) / 255,
      parseInt(result[3], 16) / 255,
      1
    );
  }
}

/**
 * Sprite component — a textured quad attached to an entity.
 *
 * Holds a reference to a `Texture` (which itself points at a TextureSource).
 * The render system reads this component together with Transform2D to draw
 * the entity on screen.
 */
export class Sprite {
  /** The Texture to display. */
  public texture: Texture;

  /** Display width in world units (0 = derive from texture). */
  public width: number;

  /** Display height in world units (0 = derive from texture). */
  public height: number;

  /** Anchor / pivot X (0-1, origin for rotation/scaling). */
  public anchorX: number;

  /** Anchor / pivot Y (0-1, origin for rotation/scaling). */
  public anchorY: number;

  /** Horizontal flip. */
  public flipX: boolean;

  /** Vertical flip. */
  public flipY: boolean;

  /** Multiplicative color tint. */
  public tint: Color;

  /** Z-order for sorting within a layer. */
  public zOrder: number;

  /** Render layer for multi-pass rendering. */
  public layer: number;

  constructor(
    texture: Texture,
    width: number = 0,
    height: number = 0,
    anchorX: number = 0.5,
    anchorY: number = 0.5,
    flipX: boolean = false,
    flipY: boolean = false,
    tint: Color = new Color(),
    zOrder: number = 0,
    layer: number = 0,
  ) {
    this.texture = texture;
    this.width = width;
    this.height = height;
    this.anchorX = anchorX;
    this.anchorY = anchorY;
    this.flipX = flipX;
    this.flipY = flipY;
    this.tint = tint;
    this.zOrder = zOrder;
    this.layer = layer;
  }
}
