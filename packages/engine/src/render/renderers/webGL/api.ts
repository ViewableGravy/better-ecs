import invariant from "tiny-invariant";
import type { ShaderSourceAsset } from "../../../asset";
import type { LooseAssetManager } from "../../../asset/AssetManager";
import { isShaderSourceAsset } from "../../../asset/utils";
import { Color } from "../../../components/sprite";
import type { ShapeRenderData, SpriteRenderData, TexturedQuadRenderData } from "../../types/low-level";
import type { RendererAPI } from "../../types/renderer-api";
import { ShaderCompiler } from "./compiler";
import { shapeDrawers, type ShapeDrawerContext, type Vec2 } from "./drawers";
import { GPUTextureManager } from "./gpu-texture-manager";
import { registry } from "./registry";

interface TexturedShaderProgram {
  program: WebGLProgram;
  positionBuffer: WebGLBuffer;
  uvBuffer: WebGLBuffer;
  vertexArray: WebGLVertexArrayObject;
  tintLocation: WebGLUniformLocation | null;
  samplerLocation: WebGLUniformLocation | null;
  timeLocation?: WebGLUniformLocation | null;
}

export class WebGLRenderAPI implements RendererAPI {
  #canvas: HTMLCanvasElement | null = null;
  #gl: WebGL2RenderingContext | null = null;

  #cameraX = 0;
  #cameraY = 0;
  #cameraZoom = 1;

  #gpuTextureManager: GPUTextureManager | null = null;
  #shaderCompiler: ShaderCompiler | null = null;
  #customTexturedShaders = new WeakMap<ShaderSourceAsset, TexturedShaderProgram>();
  #assets: LooseAssetManager | null;

  constructor(assets?: LooseAssetManager) {
    this.#assets = assets ?? null;
  }

  async initialize(canvas: HTMLCanvasElement, assets: LooseAssetManager): Promise<void> {
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
    this.#gpuTextureManager = new GPUTextureManager(gl);
    this.#assets = this.#assets ?? assets;

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    registry.initialize(gl, this.#shaderCompiler);

    const assetManager = this.#assets;
    invariant(assetManager, "Asset manager is not initialized");
    this.#initializeCustomTexturedShaders(gl, assetManager);
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

    invariant(gl, "WebGL context is not initialized");
    invariant(canvas, "Canvas element is not initialized");

    const spriteProgram = registry.get("sprite");
    this.#drawTexturedQuadWithProgram(gl, data, spriteProgram);
  }

  drawTexturedQuad(data: TexturedQuadRenderData): void {
    const gl = this.#gl;
    const canvas = this.#canvas;
    const customProgram = this.#customTexturedShaders.get(data.shader);

    invariant(gl, "WebGL context is not initialized");
    invariant(canvas, "Canvas element is not initialized");
    invariant(customProgram, "Custom shader program not found for provided shader asset");

    this.#drawTexturedQuadWithProgram(gl, data, customProgram);
  }

  #drawTexturedQuadWithProgram(
    gl: WebGL2RenderingContext,
    data: TexturedQuadRenderData | SpriteRenderData,
    program: TexturedShaderProgram,
  ): void {
    const canvas = this.#canvas;
    invariant(canvas, "Canvas element is not initialized");
    const gpuTextureManager = this.#gpuTextureManager;
    invariant(gpuTextureManager, "GPU texture manager is not initialized");

    const image = "image" in data ? data.image : null;
    const texture = image
      ? gpuTextureManager.getOrCreateTexture(image)
      : gpuTextureManager.getWhiteTexture();
    invariant(texture, "Failed to create or retrieve texture");

    const width = data.width * Math.abs(data.scaleX) * this.#cameraZoom;
    const height = data.height * Math.abs(data.scaleY) * this.#cameraZoom;

    const center = this.#worldToScreen(data.x, data.y);
    const quad = this.#buildSpriteQuad(center, width, height, data.rotation, data.anchorX, data.anchorY, data.flipX, data.flipY, data.scaleX, data.scaleY);

    const srcW = image ? (image.width > 0 ? image.width : 1) : 1;
    const srcH = image ? (image.height > 0 ? image.height : 1) : 1;
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

    gl.useProgram(program.program);
    gl.bindVertexArray(program.vertexArray);

    gl.bindBuffer(gl.ARRAY_BUFFER, program.positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, quad, gl.DYNAMIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, program.uvBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, uv, gl.DYNAMIC_DRAW);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);

    if (program.samplerLocation) {
      gl.uniform1i(program.samplerLocation, 0);
    }

    if (program.tintLocation) {
      gl.uniform4f(program.tintLocation, data.tint.r, data.tint.g, data.tint.b, data.tint.a);
    }

    if (program.timeLocation) {
      gl.uniform1f(program.timeLocation, "time" in data ? data.time : 0);
    }

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    gl.bindVertexArray(null);
  }

  #initializeCustomTexturedShaders(
    gl: WebGL2RenderingContext,
    assets: LooseAssetManager,
  ): void {
    const compiler = this.#shaderCompiler;
    if (!compiler) {
      return;
    }

    this.#customTexturedShaders = new WeakMap<ShaderSourceAsset, TexturedShaderProgram>();

    for (const loaded of assets.getLoadedByType("shader")) {
      if (!isShaderSourceAsset(loaded.asset)) {
        throw new Error(`Loaded shader asset "${loaded.key}" is invalid.`);
      }

      const program = compiler.createProgram(
        compiler.compile(gl.VERTEX_SHADER, loaded.asset.vertex, `${loaded.key}.vert`),
        compiler.compile(gl.FRAGMENT_SHADER, loaded.asset.fragment, `${loaded.key}.frag`),
      );

      const positionBuffer = gl.createBuffer();
      const uvBuffer = gl.createBuffer();
      const vertexArray = gl.createVertexArray();

      if (!positionBuffer || !uvBuffer || !vertexArray) {
        throw new Error(`Failed to create GPU buffers for custom textured shader "${loaded.key}"`);
      }

      gl.bindVertexArray(vertexArray);

      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

      gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
      gl.enableVertexAttribArray(1);
      gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0);

      gl.bindVertexArray(null);

      this.#customTexturedShaders.set(loaded.asset, {
        program,
        positionBuffer,
        uvBuffer,
        vertexArray,
        tintLocation: gl.getUniformLocation(program, "uTint"),
        samplerLocation: gl.getUniformLocation(program, "uTexture"),
        timeLocation: gl.getUniformLocation(program, "uTime"),
      });
    }
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

}
