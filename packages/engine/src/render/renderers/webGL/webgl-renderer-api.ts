import { Color } from "../../../components/sprite";
import type { ShapeRenderData, SpriteRenderData } from "../../types/low-level";
import type { RendererAPI } from "../../types/renderer-api";

type Vec2 = { x: number; y: number };

const CIRCLE_SEGMENTS = 24;

export class WebGLRenderAPI implements RendererAPI {
  #canvas: HTMLCanvasElement | null = null;
  #gl: WebGL2RenderingContext | null = null;

  #cameraX = 0;
  #cameraY = 0;
  #cameraZoom = 1;

  #colorProgram: WebGLProgram | null = null;
  #colorPositionBuffer: WebGLBuffer | null = null;
  #colorVertexArray: WebGLVertexArrayObject | null = null;
  #colorPositionLocation = -1;
  #colorUniformLocation: WebGLUniformLocation | null = null;

  #spriteProgram: WebGLProgram | null = null;
  #spritePositionBuffer: WebGLBuffer | null = null;
  #spriteUvBuffer: WebGLBuffer | null = null;
  #spriteVertexArray: WebGLVertexArrayObject | null = null;
  #spritePositionLocation = -1;
  #spriteUvLocation = -1;
  #spriteTintLocation: WebGLUniformLocation | null = null;
  #spriteSamplerLocation: WebGLUniformLocation | null = null;

  #textureCache = new WeakMap<object, WebGLTexture>();

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

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    this.#initializeColorPipeline(gl);
    this.#initializeSpritePipeline(gl);
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
    if (!gl || !canvas || !this.#spriteProgram || !this.#spriteVertexArray) {
      return;
    }

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

    gl.useProgram(this.#spriteProgram);
    gl.bindVertexArray(this.#spriteVertexArray);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.#spritePositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, quad, gl.DYNAMIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.#spriteUvBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, uv, gl.DYNAMIC_DRAW);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);

    if (this.#spriteSamplerLocation) {
      gl.uniform1i(this.#spriteSamplerLocation, 0);
    }

    if (this.#spriteTintLocation) {
      gl.uniform4f(this.#spriteTintLocation, data.tint.r, data.tint.g, data.tint.b, data.tint.a);
    }

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    gl.bindVertexArray(null);
  }

  drawShape(data: ShapeRenderData): void {
    const gl = this.#gl;
    const canvas = this.#canvas;
    if (!gl || !canvas || !this.#colorProgram || !this.#colorVertexArray) {
      return;
    }

    const center = this.#worldToScreen(data.x, data.y);

    gl.useProgram(this.#colorProgram);
    gl.bindVertexArray(this.#colorVertexArray);

    switch (data.type) {
      case "rectangle": {
        const vertices = this.#buildRectangleVertices(center, data);
        this.#drawColorTriangles(gl, vertices, data.fill);
        break;
      }
      case "line": {
        if (!data.stroke) {
          break;
        }

        const vertices = this.#buildLineVertices(center, data);
        this.#drawColorTriangles(gl, vertices, data.stroke);
        break;
      }
      case "circle": {
        const vertices = this.#buildCircleVertices(center, data);
        this.#drawColorTriangles(gl, vertices, data.fill);
        break;
      }
      case "arc": {
        const vertices = this.#buildArcVertices(center, data);
        this.#drawColorTriangles(gl, vertices, data.fill);
        break;
      }
    }

    gl.bindVertexArray(null);
  }

  getWidth(): number {
    return this.#canvas?.width ?? 0;
  }

  getHeight(): number {
    return this.#canvas?.height ?? 0;
  }

  #drawColorTriangles(gl: WebGL2RenderingContext, vertices: Float32Array, color: Color): void {
    if (!this.#colorUniformLocation || !this.#colorPositionBuffer) {
      return;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, this.#colorPositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);
    gl.uniform4f(this.#colorUniformLocation, color.r, color.g, color.b, color.a);
    gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 2);
  }

  #initializeColorPipeline(gl: WebGL2RenderingContext): void {
    const vertexShader = this.#createShader(
      gl,
      gl.VERTEX_SHADER,
      `#version 300 es
      precision mediump float;
      layout(location = 0) in vec2 aPosition;
      void main() {
        gl_Position = vec4(aPosition, 0.0, 1.0);
      }`,
    );

    const fragmentShader = this.#createShader(
      gl,
      gl.FRAGMENT_SHADER,
      `#version 300 es
      precision mediump float;
      uniform vec4 uColor;
      out vec4 outColor;
      void main() {
        outColor = uColor;
      }`,
    );

    const program = this.#createProgram(gl, vertexShader, fragmentShader);
    const positionBuffer = gl.createBuffer();
    const vertexArray = gl.createVertexArray();

    if (!program || !positionBuffer || !vertexArray) {
      throw new Error("Failed to initialize WebGL color pipeline");
    }

    this.#colorProgram = program;
    this.#colorPositionBuffer = positionBuffer;
    this.#colorVertexArray = vertexArray;
    this.#colorPositionLocation = 0;
    this.#colorUniformLocation = gl.getUniformLocation(program, "uColor");

    gl.bindVertexArray(vertexArray);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.enableVertexAttribArray(this.#colorPositionLocation);
    gl.vertexAttribPointer(this.#colorPositionLocation, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
  }

  #initializeSpritePipeline(gl: WebGL2RenderingContext): void {
    const vertexShader = this.#createShader(
      gl,
      gl.VERTEX_SHADER,
      `#version 300 es
      precision mediump float;
      layout(location = 0) in vec2 aPosition;
      layout(location = 1) in vec2 aUv;
      out vec2 vUv;
      void main() {
        vUv = aUv;
        gl_Position = vec4(aPosition, 0.0, 1.0);
      }`,
    );

    const fragmentShader = this.#createShader(
      gl,
      gl.FRAGMENT_SHADER,
      `#version 300 es
      precision mediump float;
      in vec2 vUv;
      uniform sampler2D uTexture;
      uniform vec4 uTint;
      out vec4 outColor;
      void main() {
        vec4 texColor = texture(uTexture, vUv);
        outColor = texColor * uTint;
      }`,
    );

    const program = this.#createProgram(gl, vertexShader, fragmentShader);
    const positionBuffer = gl.createBuffer();
    const uvBuffer = gl.createBuffer();
    const vertexArray = gl.createVertexArray();

    if (!program || !positionBuffer || !uvBuffer || !vertexArray) {
      throw new Error("Failed to initialize WebGL sprite pipeline");
    }

    this.#spriteProgram = program;
    this.#spritePositionBuffer = positionBuffer;
    this.#spriteUvBuffer = uvBuffer;
    this.#spriteVertexArray = vertexArray;
    this.#spritePositionLocation = 0;
    this.#spriteUvLocation = 1;
    this.#spriteTintLocation = gl.getUniformLocation(program, "uTint");
    this.#spriteSamplerLocation = gl.getUniformLocation(program, "uTexture");

    gl.bindVertexArray(vertexArray);

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.enableVertexAttribArray(this.#spritePositionLocation);
    gl.vertexAttribPointer(this.#spritePositionLocation, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
    gl.enableVertexAttribArray(this.#spriteUvLocation);
    gl.vertexAttribPointer(this.#spriteUvLocation, 2, gl.FLOAT, false, 0, 0);

    gl.bindVertexArray(null);
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

  #buildRectangleVertices(center: Vec2, data: ShapeRenderData): Float32Array {
    const canvas = this.#canvas;
    if (!canvas) {
      return new Float32Array();
    }

    const widthPixels = data.width * data.scaleX * this.#cameraZoom;
    const heightPixels = data.height * data.scaleY * this.#cameraZoom;

    const cos = Math.cos(data.rotation);
    const sin = Math.sin(data.rotation);

    const halfW = widthPixels / 2;
    const halfH = heightPixels / 2;

    const corners = [
      { x: -halfW, y: -halfH },
      { x: halfW, y: -halfH },
      { x: halfW, y: halfH },
      { x: -halfW, y: halfH },
    ];

    const ndcCorners = corners.map((corner) => {
      const rx = corner.x * cos - corner.y * sin;
      const ry = corner.x * sin + corner.y * cos;

      const screenX = (center.x + 1) * 0.5 * canvas.width + rx;
      const screenY = (1 - center.y) * 0.5 * canvas.height + ry;
      return this.#screenToNdc(screenX, screenY);
    });

    return new Float32Array([
      ndcCorners[0].x, ndcCorners[0].y,
      ndcCorners[1].x, ndcCorners[1].y,
      ndcCorners[2].x, ndcCorners[2].y,
      ndcCorners[0].x, ndcCorners[0].y,
      ndcCorners[2].x, ndcCorners[2].y,
      ndcCorners[3].x, ndcCorners[3].y,
    ]);
  }

  #buildLineVertices(center: Vec2, data: ShapeRenderData): Float32Array {
    const canvas = this.#canvas;
    if (!canvas) {
      return new Float32Array();
    }

    const length = data.width * data.scaleX * this.#cameraZoom;
    const thickness = Math.max(1, data.strokeWidth) * this.#cameraZoom;

    const halfL = length / 2;
    const halfT = thickness / 2;

    const cos = Math.cos(data.rotation);
    const sin = Math.sin(data.rotation);

    const corners = [
      { x: -halfL, y: -halfT },
      { x: halfL, y: -halfT },
      { x: halfL, y: halfT },
      { x: -halfL, y: halfT },
    ];

    const ndcCorners = corners.map((corner) => {
      const rx = corner.x * cos - corner.y * sin;
      const ry = corner.x * sin + corner.y * cos;
      const screenX = (center.x + 1) * 0.5 * canvas.width + rx;
      const screenY = (1 - center.y) * 0.5 * canvas.height + ry;
      return this.#screenToNdc(screenX, screenY);
    });

    return new Float32Array([
      ndcCorners[0].x, ndcCorners[0].y,
      ndcCorners[1].x, ndcCorners[1].y,
      ndcCorners[2].x, ndcCorners[2].y,
      ndcCorners[0].x, ndcCorners[0].y,
      ndcCorners[2].x, ndcCorners[2].y,
      ndcCorners[3].x, ndcCorners[3].y,
    ]);
  }

  #buildArcVertices(center: Vec2, data: ShapeRenderData): Float32Array {
    const canvas = this.#canvas;
    if (!canvas) {
      return new Float32Array();
    }

    const radiusX = (data.width * data.scaleX * this.#cameraZoom) / 2;
    const radiusY = (data.height * data.scaleY * this.#cameraZoom) / 2;

    const centerScreenX = (center.x + 1) * 0.5 * canvas.width;
    const centerScreenY = (1 - center.y) * 0.5 * canvas.height;

    const arcStart = data.arcStart;
    const arcEnd = data.arcEnd;
    const arcSpan = arcEnd - arcStart;
    const segments = Math.max(1, Math.ceil(Math.abs(arcSpan) / (Math.PI * 2) * CIRCLE_SEGMENTS));

    const vertices: number[] = [];

    for (let i = 0; i < segments; i += 1) {
      const t0 = arcStart + (i / segments) * arcSpan;
      const t1 = arcStart + ((i + 1) / segments) * arcSpan;

      const p0 = this.#screenToNdc(centerScreenX + Math.cos(t0) * radiusX, centerScreenY + Math.sin(t0) * radiusY);
      const p1 = this.#screenToNdc(centerScreenX + Math.cos(t1) * radiusX, centerScreenY + Math.sin(t1) * radiusY);

      vertices.push(center.x, center.y, p0.x, p0.y, p1.x, p1.y);
    }

    return new Float32Array(vertices);
  }

  #buildCircleVertices(center: Vec2, data: ShapeRenderData): Float32Array {
    const canvas = this.#canvas;
    if (!canvas) {
      return new Float32Array();
    }

    const radiusX = (data.width * data.scaleX * this.#cameraZoom) / 2;
    const radiusY = (data.height * data.scaleY * this.#cameraZoom) / 2;

    const centerScreenX = (center.x + 1) * 0.5 * canvas.width;
    const centerScreenY = (1 - center.y) * 0.5 * canvas.height;

    const vertices: number[] = [];

    for (let i = 0; i < CIRCLE_SEGMENTS; i += 1) {
      const t0 = (i / CIRCLE_SEGMENTS) * Math.PI * 2;
      const t1 = ((i + 1) / CIRCLE_SEGMENTS) * Math.PI * 2;

      const p0 = this.#screenToNdc(centerScreenX + Math.cos(t0) * radiusX, centerScreenY + Math.sin(t0) * radiusY);
      const p1 = this.#screenToNdc(centerScreenX + Math.cos(t1) * radiusX, centerScreenY + Math.sin(t1) * radiusY);

      vertices.push(center.x, center.y, p0.x, p0.y, p1.x, p1.y);
    }

    return new Float32Array(vertices);
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

  #createShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
    const shader = gl.createShader(type);
    if (!shader) {
      throw new Error("Failed to create WebGL shader");
    }

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      return shader;
    }

    const error = gl.getShaderInfoLog(shader) ?? "Unknown shader compile error";
    gl.deleteShader(shader);
    throw new Error(error);
  }

  #createProgram(
    gl: WebGL2RenderingContext,
    vertexShader: WebGLShader,
    fragmentShader: WebGLShader,
  ): WebGLProgram {
    const program = gl.createProgram();
    if (!program) {
      throw new Error("Failed to create WebGL program");
    }

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (gl.getProgramParameter(program, gl.LINK_STATUS)) {
      return program;
    }

    const error = gl.getProgramInfoLog(program) ?? "Unknown program link error";
    gl.deleteProgram(program);
    throw new Error(error);
  }
}
