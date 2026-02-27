import { Color } from "../../../components/sprite";
import type { ShapeRenderData, SpriteRenderData } from "../../types/low-level";
import type { RendererAPI } from "../../types/renderer-api";
import { ShaderCompiler } from "./compiler";
import { shapeDrawers, type ShapeDrawerContext, type Vec2 } from "./drawers";
import { registry } from "./registry";

export class WebGLRenderAPI implements RendererAPI {
  #canvas: HTMLCanvasElement | null = null;
  #gl: WebGL2RenderingContext | null = null;

  #cameraX = 0;
  #cameraY = 0;
  #cameraZoom = 1;

  #textureCache = new WeakMap<object, WebGLTexture>();
  #shaderCompiler: ShaderCompiler | null = null;

  initialize(canvas: HTMLCanvasElement): void {
    this.#canvas = canvas;

    const gl = canvas.getContext("webgl2", {
      alpha: true,
      antialias: true,
      depth: false,
      stencil: false,
      premultipliedAlpha: true,
    });

    if (!gl) {
      throw new Error("Failed to get WebGL2 rendering context");
    }

    this.#gl = gl;
    this.#shaderCompiler = new ShaderCompiler(gl);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    registry.initialize(gl, this.#shaderCompiler);
  }

  beginFrame(): void {
    const gl = this.#gl;
    if (!gl || !this.#canvas) {
      return;
    }

    gl.viewport(0, 0, this.#canvas.width, this.#canvas.height);
  }

  endFrame(): void {
    return;
  }

  clear(color: Color): void {
    const gl = this.#gl;
    if (!gl) {
      return;
    }

    gl.clearColor(color.r, color.g, color.b, color.a);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  setCamera(x: number, y: number, zoom: number): void {
    this.#cameraX = x;
    this.#cameraY = y;
    this.#cameraZoom = zoom;
  }

  getCameraX(): number {
    return this.#cameraX;
  }

  getCameraY(): number {
    return this.#cameraY;
  }

  getCameraZoom(): number {
    return this.#cameraZoom;
  }

  drawSprite(data: SpriteRenderData): void {
    const gl = this.#gl;
    const canvas = this.#canvas;
    if (!gl || !canvas) {
      return;
    }

    const spriteProgram = registry.get("sprite");

    const texture = this.#getOrCreateTexture(gl, data.image);
    if (!texture) {
      return;
    }

    const width = data.width * Math.abs(data.scaleX) * this.#cameraZoom;
    const height = data.height * Math.abs(data.scaleY) * this.#cameraZoom;

    const center = this.#worldToScreen(data.x, data.y);
    const quad = this.#buildSpriteQuad(center, width, height, data.rotation, data.anchorX, data.anchorY, data.flipX, data.flipY, data.scaleX, data.scaleY);

    const srcW = data.image.width > 0 ? data.image.width : 1;
    const srcH = data.image.height > 0 ? data.image.height : 1;
    const frameWidth = data.sourceWidth > 0 ? data.sourceWidth : srcW;
    const frameHeight = data.sourceHeight > 0 ? data.sourceHeight : srcH;

    const u0 = data.sourceX / srcW;
    const v0 = data.sourceY / srcH;
    const u1 = (data.sourceX + frameWidth) / srcW;
    const v1 = (data.sourceY + frameHeight) / srcH;

    const uv = new Float32Array([
      u0, v1,
      u1, v1,
      u0, v0,
      u1, v0,
    ]);

    gl.useProgram(spriteProgram.program);
    gl.bindVertexArray(spriteProgram.vertexArray);

    gl.bindBuffer(gl.ARRAY_BUFFER, spriteProgram.positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, quad, gl.DYNAMIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, spriteProgram.uvBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, uv, gl.DYNAMIC_DRAW);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);

    if (spriteProgram.samplerLocation) {
      gl.uniform1i(spriteProgram.samplerLocation, 0);
    }

    if (spriteProgram.tintLocation) {
      gl.uniform4f(spriteProgram.tintLocation, data.tint.r, data.tint.g, data.tint.b, data.tint.a);
    }

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    gl.bindVertexArray(null);
  }

  drawShape(data: ShapeRenderData): void {
    const gl = this.#gl;
    const canvas = this.#canvas;
    if (!gl || !canvas) {
      return;
    }

    const center = this.#worldToScreen(data.x, data.y);

    const context = this.#createShapeDrawerContext(gl, canvas, center);
    shapeDrawers.draw(context, data);
  }

  getWidth(): number {
    return this.#canvas?.width ?? 0;
  }

  getHeight(): number {
    return this.#canvas?.height ?? 0;
  }

  #drawColorTriangles(vertices: Float32Array, color: Color): void {
    const gl = this.#gl;
    if (!gl) {
      return;
    }

    const colorProgram = registry.get("color");
    if (!colorProgram.colorUniformLocation) {
      return;
    }

    gl.useProgram(colorProgram.program);
    gl.bindVertexArray(colorProgram.vertexArray);

    gl.bindBuffer(gl.ARRAY_BUFFER, colorProgram.positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);
    gl.uniform4f(colorProgram.colorUniformLocation, color.r, color.g, color.b, color.a);
    gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 2);
    gl.bindVertexArray(null);
  }

  #createShapeDrawerContext(
    gl: WebGL2RenderingContext,
    canvas: HTMLCanvasElement,
    center: Vec2,
  ): ShapeDrawerContext {
    return {
      gl,
      canvas,
      center,
      cameraZoom: this.#cameraZoom,
      programs: registry,
      drawColorTriangles: (vertices, color) => {
        this.#drawColorTriangles(vertices, color);
      },
    };
  }

  #worldToScreen(x: number, y: number): Vec2 {
    const canvas = this.#canvas;
    if (!canvas) {
      return { x: 0, y: 0 };
    }

    const screenX = (x - this.#cameraX) * this.#cameraZoom + canvas.width / 2;
    const screenY = (y - this.#cameraY) * this.#cameraZoom + canvas.height / 2;

    const ndcX = (screenX / canvas.width) * 2 - 1;
    const ndcY = 1 - (screenY / canvas.height) * 2;

    return { x: ndcX, y: ndcY };
  }

  #screenToNdc(x: number, y: number): Vec2 {
    const canvas = this.#canvas;
    if (!canvas) {
      return { x: 0, y: 0 };
    }

    return {
      x: (x / canvas.width) * 2 - 1,
      y: 1 - (y / canvas.height) * 2,
    };
  }

  #buildSpriteQuad(
    center: Vec2,
    width: number,
    height: number,
    rotation: number,
    anchorX: number,
    anchorY: number,
    flipX: boolean,
    flipY: boolean,
    scaleX: number,
    scaleY: number,
  ): Float32Array {
    const canvas = this.#canvas;
    if (!canvas) {
      return new Float32Array();
    }

    const pivotOffsetX = -width * anchorX;
    const pivotOffsetY = -height * anchorY;

    const local = [
      { x: pivotOffsetX, y: pivotOffsetY + height },
      { x: pivotOffsetX + width, y: pivotOffsetY + height },
      { x: pivotOffsetX, y: pivotOffsetY },
      { x: pivotOffsetX + width, y: pivotOffsetY },
    ];

    const flipScaleX = (flipX ? -1 : 1) * (scaleX < 0 ? -1 : 1);
    const flipScaleY = (flipY ? -1 : 1) * (scaleY < 0 ? -1 : 1);

    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);

    const vertices = local.map((point) => {
      const fx = point.x * flipScaleX;
      const fy = point.y * flipScaleY;
      const rx = fx * cos - fy * sin;
      const ry = fx * sin + fy * cos;

      const screenX = (center.x + 1) * 0.5 * canvas.width + rx;
      const screenY = (1 - center.y) * 0.5 * canvas.height + ry;
      return this.#screenToNdc(screenX, screenY);
    });

    return new Float32Array([
      vertices[0].x, vertices[0].y,
      vertices[1].x, vertices[1].y,
      vertices[2].x, vertices[2].y,
      vertices[3].x, vertices[3].y,
    ]);
  }

  #getOrCreateTexture(
    gl: WebGL2RenderingContext,
    source: HTMLImageElement | ImageBitmap | HTMLCanvasElement,
  ): WebGLTexture | null {
    const cacheKey = source as unknown as object;
    const existing = this.#textureCache.get(cacheKey);
    if (existing) {
      return existing;
    }

    const texture = gl.createTexture();
    if (!texture) {
      return null;
    }

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);

    this.#textureCache.set(cacheKey, texture);
    return texture;
  }

}
