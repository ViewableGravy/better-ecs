import {
  BELT_STRESS_BELT_SIZE,
  BELT_STRESS_ITEM_SIZE,
} from "@legacy/scenes/belt-stress/config";
import type { TextureSourceData } from "@engine/components";
import invariant from "tiny-invariant";

export type BeltStressRendererConfiguration = {
  readonly beltPositions: Float32Array;
  readonly itemCount: number;
  readonly beltImage: TextureSourceData;
  readonly beltFrameUvRects: Float32Array;
  readonly itemImage: TextureSourceData;
  readonly itemUvRect: Float32Array;
};

export type BeltStressRendererMetrics = {
  readonly uploadedBytes: number;
  readonly uploadCount: number;
  readonly lastUploadMs: number;
  readonly drawCalls: number;
  readonly lastDrawSubmissionMs: number;
};

type CameraState = {
  readonly x: number;
  readonly y: number;
  readonly zoom: number;
  readonly viewportWidth: number;
  readonly viewportHeight: number;
};

type SpriteProgram = {
  readonly program: WebGLProgram;
  readonly viewport: WebGLUniformLocation | null;
  readonly cameraPosition: WebGLUniformLocation | null;
  readonly cameraZoom: WebGLUniformLocation | null;
  readonly size: WebGLUniformLocation | null;
  readonly uvRect: WebGLUniformLocation | null;
  readonly interpolationAlpha: WebGLUniformLocation | null;
  readonly sampler: WebGLUniformLocation | null;
};

const BELT_VERTEX_SHADER = `#version 300 es
precision highp float;

layout(location = 0) in vec2 aCorner;
layout(location = 1) in vec2 aPosition;

uniform vec2 uViewport;
uniform vec2 uCameraPosition;
uniform float uCameraZoom;
uniform vec2 uSize;
uniform vec4 uUvRect;

out vec2 vUv;

void main() {
  vec2 center = vec2(
    ((aPosition.x - uCameraPosition.x) * uCameraZoom / uViewport.x) * 2.0,
    -((aPosition.y - uCameraPosition.y) * uCameraZoom / uViewport.y) * 2.0
  );
  vec2 local = (aCorner - vec2(0.5)) * uSize * uCameraZoom;
  vec2 offset = vec2((local.x / uViewport.x) * 2.0, -(local.y / uViewport.y) * 2.0);

  vUv = mix(uUvRect.xy, uUvRect.zw, aCorner);
  gl_Position = vec4(center + offset, 0.0, 1.0);
}
`;

const ITEM_VERTEX_SHADER = `#version 300 es
precision highp float;

layout(location = 0) in vec2 aCorner;
layout(location = 1) in vec2 aPreviousPosition;
layout(location = 2) in vec2 aCurrentPosition;

uniform vec2 uViewport;
uniform vec2 uCameraPosition;
uniform float uCameraZoom;
uniform vec2 uSize;
uniform vec4 uUvRect;
uniform float uInterpolationAlpha;

out vec2 vUv;

void main() {
  vec2 position = mix(aPreviousPosition, aCurrentPosition, uInterpolationAlpha);
  vec2 center = vec2(
    ((position.x - uCameraPosition.x) * uCameraZoom / uViewport.x) * 2.0,
    -((position.y - uCameraPosition.y) * uCameraZoom / uViewport.y) * 2.0
  );
  vec2 local = (aCorner - vec2(0.5)) * uSize * uCameraZoom;
  vec2 offset = vec2((local.x / uViewport.x) * 2.0, -(local.y / uViewport.y) * 2.0);

  vUv = mix(uUvRect.xy, uUvRect.zw, aCorner);
  gl_Position = vec4(center + offset, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER = `#version 300 es
precision mediump float;

uniform sampler2D uTexture;
in vec2 vUv;
out vec4 outColor;

void main() {
  outColor = texture(uTexture, vUv);
}
`;

export class BeltStressRenderer {
  readonly #gl: WebGL2RenderingContext;
  readonly #cornerBuffer: WebGLBuffer;
  readonly #beltPositionBuffer: WebGLBuffer;
  readonly #itemPositionBuffers: readonly [WebGLBuffer, WebGLBuffer];
  readonly #beltVertexArray: WebGLVertexArrayObject;
  readonly #itemVertexArray: WebGLVertexArrayObject;
  readonly #beltProgram: SpriteProgram;
  readonly #itemProgram: SpriteProgram;
  #beltTexture: WebGLTexture | null = null;
  #itemTexture: WebGLTexture | null = null;
  #beltFrameUvRects: Float32Array<ArrayBufferLike> = new Float32Array(0);
  #itemUvRect: Float32Array<ArrayBufferLike> = new Float32Array([0, 0, 1, 1]);
  #beltCount = 0;
  #itemCount = 0;
  #previousPositionBufferIndex: 0 | 1 = 0;
  #currentPositionBufferIndex: 0 | 1 = 1;
  #hasPositions = false;
  #uploadedBytes = 0;
  #uploadCount = 0;
  #lastUploadMs = 0;
  #drawCalls = 0;
  #lastDrawSubmissionMs = 0;

  public constructor(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext("webgl2");
    invariant(gl, "Belt stress renderer requires WebGL2");
    this.#gl = gl;
    this.#cornerBuffer = requireBuffer(gl, "belt stress corner");
    this.#beltPositionBuffer = requireBuffer(gl, "belt stress positions");
    this.#itemPositionBuffers = [
      requireBuffer(gl, "belt stress previous item positions"),
      requireBuffer(gl, "belt stress current item positions"),
    ];
    this.#beltVertexArray = requireVertexArray(gl, "belt stress belts");
    this.#itemVertexArray = requireVertexArray(gl, "belt stress items");
    this.#beltProgram = createSpriteProgram(gl, BELT_VERTEX_SHADER);
    this.#itemProgram = createSpriteProgram(gl, ITEM_VERTEX_SHADER);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.#cornerBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      0, 1,
      1, 1,
      0, 0,
      1, 0,
    ]), gl.STATIC_DRAW);
    this.#configureBeltVertexArray();
  }

  public configure(configuration: BeltStressRendererConfiguration): void {
    const gl = this.#gl;
    this.#beltCount = configuration.beltPositions.length / 2;
    this.#itemCount = configuration.itemCount;
    this.#beltFrameUvRects = configuration.beltFrameUvRects;
    this.#itemUvRect = configuration.itemUvRect;
    this.#beltTexture = replaceTexture(gl, this.#beltTexture, configuration.beltImage);
    this.#itemTexture = replaceTexture(gl, this.#itemTexture, configuration.itemImage);
    this.#hasPositions = false;
    this.#previousPositionBufferIndex = 0;
    this.#currentPositionBufferIndex = 1;

    gl.bindBuffer(gl.ARRAY_BUFFER, this.#beltPositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, configuration.beltPositions, gl.STATIC_DRAW);

    const positionByteLength = this.#itemCount * 2 * Float32Array.BYTES_PER_ELEMENT;
    for (const buffer of this.#itemPositionBuffers) {
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, positionByteLength, gl.DYNAMIC_DRAW);
    }
  }

  public uploadPositions(positions: Float32Array): void {
    invariant(
      positions.length === this.#itemCount * 2,
      `Expected ${this.#itemCount * 2} position values, received ${positions.length}`,
    );

    const gl = this.#gl;
    const startedAt = performance.now();
    if (!this.#hasPositions) {
      for (const buffer of this.#itemPositionBuffers) {
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, positions);
      }
      this.#hasPositions = true;
      this.#uploadedBytes += positions.byteLength * 2;
    } else {
      this.#previousPositionBufferIndex = this.#currentPositionBufferIndex;
      this.#currentPositionBufferIndex = this.#currentPositionBufferIndex === 0 ? 1 : 0;
      gl.bindBuffer(gl.ARRAY_BUFFER, this.#itemPositionBuffers[this.#currentPositionBufferIndex]);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, positions);
      this.#uploadedBytes += positions.byteLength;
    }

    this.#uploadCount += 1;
    this.#lastUploadMs = performance.now() - startedAt;
  }

  public draw(camera: CameraState, interpolationAlpha: number, updateTick: number): void {
    if (!this.#beltTexture || !this.#itemTexture) {
      return;
    }

    const startedAt = performance.now();
    this.#drawCalls = 0;
    this.#drawBelts(camera, updateTick);
    if (this.#hasPositions) {
      this.#drawItems(camera, interpolationAlpha);
    }
    this.#lastDrawSubmissionMs = performance.now() - startedAt;
  }

  public clear(): void {
    this.#beltCount = 0;
    this.#itemCount = 0;
    this.#hasPositions = false;
  }

  public metrics(): BeltStressRendererMetrics {
    return {
      uploadedBytes: this.#uploadedBytes,
      uploadCount: this.#uploadCount,
      lastUploadMs: this.#lastUploadMs,
      drawCalls: this.#drawCalls,
      lastDrawSubmissionMs: this.#lastDrawSubmissionMs,
    };
  }

  #configureBeltVertexArray(): void {
    const gl = this.#gl;
    gl.bindVertexArray(this.#beltVertexArray);
    configureAttribute(gl, this.#cornerBuffer, 0, 0);
    configureAttribute(gl, this.#beltPositionBuffer, 1, 1);
    gl.bindVertexArray(null);
  }

  #configureItemVertexArray(): void {
    const gl = this.#gl;
    gl.bindVertexArray(this.#itemVertexArray);
    configureAttribute(gl, this.#cornerBuffer, 0, 0);
    configureAttribute(gl, this.#itemPositionBuffers[this.#previousPositionBufferIndex], 1, 1);
    configureAttribute(gl, this.#itemPositionBuffers[this.#currentPositionBufferIndex], 2, 1);
    gl.bindVertexArray(null);
  }

  #drawBelts(camera: CameraState, updateTick: number): void {
    if (this.#beltCount === 0 || this.#beltFrameUvRects.length === 0 || !this.#beltTexture) {
      return;
    }

    const gl = this.#gl;
    const frameCount = this.#beltFrameUvRects.length / 4;
    const frameIndex = Math.floor(updateTick * 0.5) % frameCount;
    const uvOffset = frameIndex * 4;
    gl.useProgram(this.#beltProgram.program);
    gl.bindVertexArray(this.#beltVertexArray);
    applyCameraUniforms(gl, this.#beltProgram, camera);
    setUniform2f(gl, this.#beltProgram.size, BELT_STRESS_BELT_SIZE, BELT_STRESS_BELT_SIZE);
    setUniform4fFromArray(gl, this.#beltProgram.uvRect, this.#beltFrameUvRects, uvOffset);
    bindTexture(gl, this.#beltProgram, this.#beltTexture);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, this.#beltCount);
    gl.bindVertexArray(null);
    this.#drawCalls += 1;
  }

  #drawItems(camera: CameraState, interpolationAlpha: number): void {
    if (this.#itemCount === 0 || !this.#itemTexture) {
      return;
    }

    const gl = this.#gl;
    this.#configureItemVertexArray();
    gl.useProgram(this.#itemProgram.program);
    gl.bindVertexArray(this.#itemVertexArray);
    applyCameraUniforms(gl, this.#itemProgram, camera);
    setUniform2f(gl, this.#itemProgram.size, BELT_STRESS_ITEM_SIZE, BELT_STRESS_ITEM_SIZE);
    setUniform4fFromArray(gl, this.#itemProgram.uvRect, this.#itemUvRect, 0);
    if (this.#itemProgram.interpolationAlpha) {
      gl.uniform1f(this.#itemProgram.interpolationAlpha, interpolationAlpha);
    }
    bindTexture(gl, this.#itemProgram, this.#itemTexture);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, this.#itemCount);
    gl.bindVertexArray(null);
    this.#drawCalls += 1;
  }
}

function createSpriteProgram(gl: WebGL2RenderingContext, vertexSource: string): SpriteProgram {
  const program = gl.createProgram();
  invariant(program, "Failed to create belt stress shader program");
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);
  invariant(gl.getProgramParameter(program, gl.LINK_STATUS), gl.getProgramInfoLog(program) ?? "Shader link failed");

  return {
    program,
    viewport: gl.getUniformLocation(program, "uViewport"),
    cameraPosition: gl.getUniformLocation(program, "uCameraPosition"),
    cameraZoom: gl.getUniformLocation(program, "uCameraZoom"),
    size: gl.getUniformLocation(program, "uSize"),
    uvRect: gl.getUniformLocation(program, "uUvRect"),
    interpolationAlpha: gl.getUniformLocation(program, "uInterpolationAlpha"),
    sampler: gl.getUniformLocation(program, "uTexture"),
  };
}

function compileShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  invariant(shader, "Failed to create belt stress shader");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  invariant(gl.getShaderParameter(shader, gl.COMPILE_STATUS), gl.getShaderInfoLog(shader) ?? "Shader compile failed");
  return shader;
}

function requireBuffer(gl: WebGL2RenderingContext, label: string): WebGLBuffer {
  const buffer = gl.createBuffer();
  invariant(buffer, `Failed to create ${label} buffer`);
  return buffer;
}

function requireVertexArray(gl: WebGL2RenderingContext, label: string): WebGLVertexArrayObject {
  const vertexArray = gl.createVertexArray();
  invariant(vertexArray, `Failed to create ${label} vertex array`);
  return vertexArray;
}

function configureAttribute(
  gl: WebGL2RenderingContext,
  buffer: WebGLBuffer,
  location: number,
  divisor: number,
): void {
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.enableVertexAttribArray(location);
  gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0);
  gl.vertexAttribDivisor(location, divisor);
}

function replaceTexture(
  gl: WebGL2RenderingContext,
  previous: WebGLTexture | null,
  source: TextureSourceData,
): WebGLTexture {
  if (previous) {
    gl.deleteTexture(previous);
  }

  const texture = gl.createTexture();
  invariant(texture, "Failed to create belt stress texture");
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 1);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
  return texture;
}

function applyCameraUniforms(gl: WebGL2RenderingContext, program: SpriteProgram, camera: CameraState): void {
  setUniform2f(gl, program.viewport, camera.viewportWidth, camera.viewportHeight);
  setUniform2f(gl, program.cameraPosition, camera.x, camera.y);
  if (program.cameraZoom) {
    gl.uniform1f(program.cameraZoom, camera.zoom);
  }
}

function setUniform2f(
  gl: WebGL2RenderingContext,
  location: WebGLUniformLocation | null,
  first: number,
  second: number,
): void {
  if (location) {
    gl.uniform2f(location, first, second);
  }
}

function setUniform4fFromArray(
  gl: WebGL2RenderingContext,
  location: WebGLUniformLocation | null,
  source: Float32Array,
  offset: number,
): void {
  if (!location) {
    return;
  }

  gl.uniform4f(
    location,
    source[offset] ?? 0,
    source[offset + 1] ?? 0,
    source[offset + 2] ?? 1,
    source[offset + 3] ?? 1,
  );
}

function bindTexture(gl: WebGL2RenderingContext, program: SpriteProgram, texture: WebGLTexture): void {
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  if (program.sampler) {
    gl.uniform1i(program.sampler, 0);
  }
}
