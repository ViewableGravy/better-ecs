import invariant from "tiny-invariant";

export class GPUTextureManager {
  readonly #gl: WebGL2RenderingContext;
  readonly #textureCache = new WeakMap<object, WebGLTexture>();
  #whiteTexture: WebGLTexture | null = null;

  constructor(gl: WebGL2RenderingContext) {
    this.#gl = gl;
  }

  getOrCreateTexture(source: HTMLImageElement | ImageBitmap | HTMLCanvasElement): WebGLTexture {
    const cacheKey = source as unknown as object;
    const existing = this.#textureCache.get(cacheKey);
    if (existing) {
      return existing;
    }

    const texture = this.#gl.createTexture();
    invariant(texture, "Failed to create WebGL texture");

    this.#gl.bindTexture(this.#gl.TEXTURE_2D, texture);
    this.#gl.texParameteri(this.#gl.TEXTURE_2D, this.#gl.TEXTURE_MIN_FILTER, this.#gl.LINEAR);
    this.#gl.texParameteri(this.#gl.TEXTURE_2D, this.#gl.TEXTURE_MAG_FILTER, this.#gl.LINEAR);
    this.#gl.texParameteri(this.#gl.TEXTURE_2D, this.#gl.TEXTURE_WRAP_S, this.#gl.CLAMP_TO_EDGE);
    this.#gl.texParameteri(this.#gl.TEXTURE_2D, this.#gl.TEXTURE_WRAP_T, this.#gl.CLAMP_TO_EDGE);
    this.#gl.pixelStorei(this.#gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 1);
    this.#gl.texImage2D(this.#gl.TEXTURE_2D, 0, this.#gl.RGBA, this.#gl.RGBA, this.#gl.UNSIGNED_BYTE, source);

    this.#textureCache.set(cacheKey, texture);
    return texture;
  }

  getWhiteTexture(): WebGLTexture {
    if (this.#whiteTexture) {
      return this.#whiteTexture;
    }

    const texture = this.#gl.createTexture();
    invariant(texture, "Failed to create fallback white texture");

    this.#gl.bindTexture(this.#gl.TEXTURE_2D, texture);
    this.#gl.texParameteri(this.#gl.TEXTURE_2D, this.#gl.TEXTURE_MIN_FILTER, this.#gl.LINEAR);
    this.#gl.texParameteri(this.#gl.TEXTURE_2D, this.#gl.TEXTURE_MAG_FILTER, this.#gl.LINEAR);
    this.#gl.texParameteri(this.#gl.TEXTURE_2D, this.#gl.TEXTURE_WRAP_S, this.#gl.CLAMP_TO_EDGE);
    this.#gl.texParameteri(this.#gl.TEXTURE_2D, this.#gl.TEXTURE_WRAP_T, this.#gl.CLAMP_TO_EDGE);
    this.#gl.texImage2D(
      this.#gl.TEXTURE_2D,
      0,
      this.#gl.RGBA,
      1,
      1,
      0,
      this.#gl.RGBA,
      this.#gl.UNSIGNED_BYTE,
      new Uint8Array([255, 255, 255, 255]),
    );

    this.#whiteTexture = texture;
    return texture;
  }
}