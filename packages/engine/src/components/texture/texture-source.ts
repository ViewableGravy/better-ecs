/**
 * TextureSource — holds the raw image data that can be uploaded to the GPU.
 *
 * Multiple `Texture` instances can reference the same `TextureSource`
 * (e.g. frames in a sprite-sheet sharing one atlas upload).
 */

export type TextureSourceData = HTMLImageElement | ImageBitmap | HTMLCanvasElement;

export class TextureSource {
  private static nextId = 1;

  /** Unique identifier for this source (used as renderer cache key). */
  public readonly uid: number;

  /** The underlying image data. */
  public resource: TextureSourceData;

  /** Pixel width of the source image. */
  public readonly width: number;

  /** Pixel height of the source image. */
  public readonly height: number;

  constructor(resource: TextureSourceData) {
    this.uid = TextureSource.nextId++;
    this.resource = resource;
    this.width = resource.width;
    this.height = resource.height;
  }
}
