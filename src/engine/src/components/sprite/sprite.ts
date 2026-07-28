import type { RegisteredAssets } from "@engine/core";
import { Component } from "@engine/ecs/component";

export class Rgba {
  constructor(
    public r: number = 1,
    public g: number = 1,
    public b: number = 1,
    public a: number = 1,
  ) {}

  public set(r: number, g: number, b: number, a: number = 1): this {
    this.r = r;
    this.g = g;
    this.b = b;
    this.a = a;
    return this;
  }

  public copyFrom(other: Rgba): void {
    this.set(other.r, other.g, other.b, other.a);
  }

}

/**
 * Sprite component — a textured quad attached to an entity.
 *
 * Holds a reference to a texture asset ID. The render system resolves this
 * ID to a Texture object via the AssetManager and then to a GPU handle.
 *
 * The render system reads this component together with Transform2D to draw
 * the entity on screen.
 */
export class Sprite extends Component {
  /** The asset ID of the texture to display. */
  public assetId: Exclude<keyof RegisteredAssets, number | symbol>;

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

  /** Z-order for sorting within a layer. */
  public zOrder: number;

  /** Render layer for multi-pass rendering. */
  public layer: number;

  /**
   * Whether this sprite is expected to change frequently.
   *
   * Retained rendering keeps frequently changing sprites separate so their GPU uploads do not
   * include neighboring sprites that rarely change.
   */
  public isDynamic: boolean;

  constructor(
    assetId: Exclude<keyof RegisteredAssets, number | symbol>,
    width: number = 0,
    height: number = 0,
    anchorX: number = 0.5,
    anchorY: number = 0.5,
    flipX: boolean = false,
    flipY: boolean = false,
    zOrder: number = 0,
    layer: number = 0,
    isDynamic: boolean = true,
  ) {
    super();
    this.assetId = assetId;
    this.width = width;
    this.height = height;
    this.anchorX = anchorX;
    this.anchorY = anchorY;
    this.flipX = flipX;
    this.flipY = flipY;
    this.zOrder = zOrder;
    this.layer = layer;
    this.isDynamic = isDynamic;
  }
}
