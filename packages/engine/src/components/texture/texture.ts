/**
 * Texture — a lightweight view into a TextureSource.
 *
 * Represents a rectangular region of a source image. This is the primary
 * object users interact with when attaching visuals to entities.
 *
 * Usage:
 *   const source = new TextureSource(imageElement);
 *   const texture = new Texture(source);                // full image
 *   const frame   = new Texture(source, 0, 0, 32, 32); // sprite-sheet cell
 */

import { TextureSource, type TextureSourceData } from "./texture-source";

export class Texture {
  private static nextId = 1;

  /** Unique ID for this texture instance. */
  public readonly uid: number;

  /** The underlying source that owns the pixel data. */
  public readonly source: TextureSource;

  /**
   * @param source  A TextureSource, or raw image data that will be wrapped
   *                in a new TextureSource automatically.
   * @param frameX  X offset into the source atlas (default 0).
   * @param frameY  Y offset into the source atlas (default 0).
   * @param frameW  Width of the sub-region (0 = full source width).
   * @param frameH  Height of the sub-region (0 = full source height).
   */
  constructor(
    source: TextureSource | TextureSourceData,
    public  frameX = 0,
    public frameY = 0,
    public frameWidth = 0,
    public frameHeight = 0,
  ) {
    this.uid = Texture.nextId++;
    this.source = source instanceof TextureSource 
      ? source 
      : new TextureSource(source);
  }

  /** Logical width of the texture (after frame is resolved). */
  public get width(): number {
    return this.frameWidth || this.source.width;
  }

  /** Logical height of the texture (after frame is resolved). */
  public get height(): number {
    return this.frameHeight || this.source.height;
  }
}
