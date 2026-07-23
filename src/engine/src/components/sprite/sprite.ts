import type { RegisteredAssets } from "@engine/core";
import { Component } from "@engine/ecs/component";

export class Rgba {
  private _r: number;
  private _g: number;
  private _b: number;
  private _a: number;
  private _changeObserver: RgbaChangeObserver | undefined;

  constructor(
    r: number = 1,
    g: number = 1,
    b: number = 1,
    a: number = 1,
    changeObserver?: RgbaChangeObserver,
  ) {
    this._r = r;
    this._g = g;
    this._b = b;
    this._a = a;
    this._changeObserver = changeObserver;
    Object.defineProperties(this, {
      _r: { enumerable: false },
      _g: { enumerable: false },
      _b: { enumerable: false },
      _a: { enumerable: false },
      _changeObserver: { enumerable: false },
      r: {
        enumerable: true,
        configurable: true,
        get: Rgba.#getR,
        set: Rgba.#setR,
      },
      g: {
        enumerable: true,
        configurable: true,
        get: Rgba.#getG,
        set: Rgba.#setG,
      },
      b: {
        enumerable: true,
        configurable: true,
        get: Rgba.#getB,
        set: Rgba.#setB,
      },
      a: {
        enumerable: true,
        configurable: true,
        get: Rgba.#getA,
        set: Rgba.#setA,
      },
    });
  }

  get r(): number { return this._r; }
  set r(value: number) {
    if (this._r === value) return;
    this._r = value;
    this._changeObserver?.notifyRgbaChanged();
  }

  get g(): number { return this._g; }
  set g(value: number) {
    if (this._g === value) return;
    this._g = value;
    this._changeObserver?.notifyRgbaChanged();
  }

  get b(): number { return this._b; }
  set b(value: number) {
    if (this._b === value) return;
    this._b = value;
    this._changeObserver?.notifyRgbaChanged();
  }

  get a(): number { return this._a; }
  set a(value: number) {
    if (this._a === value) return;
    this._a = value;
    this._changeObserver?.notifyRgbaChanged();
  }

  /** @internal Bind nested color writes to an owning visual component. */
  setChangeObserver(changeObserver?: RgbaChangeObserver): void {
    this._changeObserver = changeObserver;
  }

  static #getR(this: Rgba): number { return this._r; }
  static #setR(this: Rgba, value: number): void {
    if (this._r === value) return;
    this._r = value;
    this._changeObserver?.notifyRgbaChanged();
  }
  static #getG(this: Rgba): number { return this._g; }
  static #setG(this: Rgba, value: number): void {
    if (this._g === value) return;
    this._g = value;
    this._changeObserver?.notifyRgbaChanged();
  }
  static #getB(this: Rgba): number { return this._b; }
  static #setB(this: Rgba, value: number): void {
    if (this._b === value) return;
    this._b = value;
    this._changeObserver?.notifyRgbaChanged();
  }
  static #getA(this: Rgba): number { return this._a; }
  static #setA(this: Rgba, value: number): void {
    if (this._a === value) return;
    this._a = value;
    this._changeObserver?.notifyRgbaChanged();
  }

  public set(r: number, g: number, b: number, a: number = 1): this {
    this.r = r;
    this.g = g;
    this.b = b;
    this.a = a;
    return this;
  }

  public copyFrom(other: Rgba): void {
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
    const r = Math.round(this.r * 255)
      .toString(16)
      .padStart(2, "0");
    const g = Math.round(this.g * 255)
      .toString(16)
      .padStart(2, "0");
    const b = Math.round(this.b * 255)
      .toString(16)
      .padStart(2, "0");
    return `#${r}${g}${b}`;
  }

  /** Create from hex string */
  public static fromHex(hex: string): Rgba {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return new Rgba();
    return new Rgba(
      parseInt(result[1], 16) / 255,
      parseInt(result[2], 16) / 255,
      parseInt(result[3], 16) / 255,
      1,
    );
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
   * Queue update policy.
   * - true: always evaluate this sprite in the queue hot path (default)
   * - false: eligible for static cohort reuse
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
