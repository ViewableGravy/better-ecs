import type { RegisteredAssets } from "@engine/core";
import { Component } from "@engine/ecs/component";

export class Rgba {
  #r: number;
  #g: number;
  #b: number;
  #a: number;
  readonly #changeObserver: RgbaChangeObserver | undefined;

  constructor(
    r: number = 1,
    g: number = 1,
    b: number = 1,
    a: number = 1,
    changeObserver?: RgbaChangeObserver,
  ) {
    this.#r = r;
    this.#g = g;
    this.#b = b;
    this.#a = a;
    this.#changeObserver = changeObserver;
  }

  get r(): number { return this.#r; }
  set r(value: number) {
    if (this.#r === value) return;
    this.#r = value;
    this.#changeObserver?.notifyRgbaChanged();
  }

  get g(): number { return this.#g; }
  set g(value: number) {
    if (this.#g === value) return;
    this.#g = value;
    this.#changeObserver?.notifyRgbaChanged();
  }

  get b(): number { return this.#b; }
  set b(value: number) {
    if (this.#b === value) return;
    this.#b = value;
    this.#changeObserver?.notifyRgbaChanged();
  }

  get a(): number { return this.#a; }
  set a(value: number) {
    if (this.#a === value) return;
    this.#a = value;
    this.#changeObserver?.notifyRgbaChanged();
  }

  public set(r: number, g: number, b: number, a: number = 1): this {
    if (this.#r === r && this.#g === g && this.#b === b && this.#a === a) {
      return this;
    }

    this.#r = r;
    this.#g = g;
    this.#b = b;
    this.#a = a;
    this.#changeObserver?.notifyRgbaChanged();
    return this;
  }

  public copyFrom(other: Rgba): void {
    this.set(other.r, other.g, other.b, other.a);
  }

}

export interface RgbaChangeObserver {
  notifyRgbaChanged(): void;
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
  #assetId: Exclude<keyof RegisteredAssets, number | symbol>;
  #width: number;
  #height: number;
  #anchorX: number;
  #anchorY: number;
  #flipX: boolean;
  #flipY: boolean;
  #zOrder: number;
  #layer: number;
  #isDynamic: boolean;

  /** The asset ID of the texture to display. */
  get assetId(): Exclude<keyof RegisteredAssets, number | symbol> { return this.#assetId; }
  set assetId(value: Exclude<keyof RegisteredAssets, number | symbol>) {
    if (this.#assetId === value) return;
    this.#assetId = value;
    this.__markChanged();
  }

  /** Display width in world units (0 = derive from texture). */
  get width(): number { return this.#width; }
  set width(value: number) {
    if (this.#width === value) return;
    this.#width = value;
    this.__markChanged();
  }

  /** Display height in world units (0 = derive from texture). */
  get height(): number { return this.#height; }
  set height(value: number) {
    if (this.#height === value) return;
    this.#height = value;
    this.__markChanged();
  }

  /** Anchor / pivot X (0-1, origin for rotation/scaling). */
  get anchorX(): number { return this.#anchorX; }
  set anchorX(value: number) {
    if (this.#anchorX === value) return;
    this.#anchorX = value;
    this.__markChanged();
  }

  /** Anchor / pivot Y (0-1, origin for rotation/scaling). */
  get anchorY(): number { return this.#anchorY; }
  set anchorY(value: number) {
    if (this.#anchorY === value) return;
    this.#anchorY = value;
    this.__markChanged();
  }

  /** Horizontal flip. */
  get flipX(): boolean { return this.#flipX; }
  set flipX(value: boolean) {
    if (this.#flipX === value) return;
    this.#flipX = value;
    this.__markChanged();
  }

  /** Vertical flip. */
  get flipY(): boolean { return this.#flipY; }
  set flipY(value: boolean) {
    if (this.#flipY === value) return;
    this.#flipY = value;
    this.__markChanged();
  }

  /** Z-order for sorting within a layer. */
  get zOrder(): number { return this.#zOrder; }
  set zOrder(value: number) {
    if (this.#zOrder === value) return;
    this.#zOrder = value;
    this.__markChanged();
  }

  /** Render layer for multi-pass rendering. */
  get layer(): number { return this.#layer; }
  set layer(value: number) {
    if (this.#layer === value) return;
    this.#layer = value;
    this.__markChanged();
  }

  /**
   * Whether this sprite is expected to change frequently.
   *
   * Retained rendering keeps frequently changing sprites separate so their GPU uploads do not
   * include neighboring sprites that rarely change.
   */
  get isDynamic(): boolean { return this.#isDynamic; }
  set isDynamic(value: boolean) {
    if (this.#isDynamic === value) return;
    this.#isDynamic = value;
    this.__markChanged();
  }

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
    this.#assetId = assetId;
    this.#width = width;
    this.#height = height;
    this.#anchorX = anchorX;
    this.#anchorY = anchorY;
    this.#flipX = flipX;
    this.#flipY = flipY;
    this.#zOrder = zOrder;
    this.#layer = layer;
    this.#isDynamic = isDynamic;
  }
}
