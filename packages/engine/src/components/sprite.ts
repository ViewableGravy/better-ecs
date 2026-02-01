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

export class Sprite {
  /** Texture reference (asset ID or path) */
  public texture: string;
  
  /** Source rectangle X in texture (for atlases) */
  public sourceX: number;
  
  /** Source rectangle Y in texture (for atlases) */
  public sourceY: number;
  
  /** Source width (0 = use texture width) */
  public sourceWidth: number;
  
  /** Source height (0 = use texture height) */
  public sourceHeight: number;
  
  /** Pivot X (0-1, origin for rotation/scaling) */
  public pivotX: number;
  
  /** Pivot Y (0-1, origin for rotation/scaling) */
  public pivotY: number;
  
  /** Horizontal flip */
  public flipX: boolean;
  
  /** Vertical flip */
  public flipY: boolean;
  
  /** Color tint */
  public tint: Color;
  
  /** Z-order for sorting within a layer */
  public zOrder: number;
  
  /** Render layer for multi-pass rendering */
  public layer: number;

  constructor(
    texture: string = "",
    sourceX: number = 0,
    sourceY: number = 0,
    sourceWidth: number = 0,
    sourceHeight: number = 0,
    pivotX: number = 0.5,
    pivotY: number = 0.5,
    flipX: boolean = false,
    flipY: boolean = false,
    tint: Color = new Color(),
    zOrder: number = 0,
    layer: number = 0
  ) {
    this.texture = texture;
    this.sourceX = sourceX;
    this.sourceY = sourceY;
    this.sourceWidth = sourceWidth;
    this.sourceHeight = sourceHeight;
    this.pivotX = pivotX;
    this.pivotY = pivotY;
    this.flipX = flipX;
    this.flipY = flipY;
    this.tint = tint;
    this.zOrder = zOrder;
    this.layer = layer;
  }
}
