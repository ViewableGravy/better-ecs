import type { TextureSourceData } from "@engine/components/texture";
import { ShaderCompiler } from "@engine/render/renderers/webGL/compiler";
import { GPUTextureManager } from "@engine/render/renderers/webGL/gpu-texture-manager";
import invariant from "tiny-invariant";

/** Describes a single per-instance vertex attribute. */
export type InstancedAttributeDescriptor = {
  /** Attribute location in the vertex shader. */
  readonly location: number;
  /** Number of components (1-4). */
  readonly size: number;
  /** Byte offset from the start of each instance's data. */
  readonly offset: number;
};

/** Configuration for creating an {@link InstancedBucket}. */
export type InstancedBucketDescriptor = {
  /** GLSL vertex shader source (#version 300 es). */
  readonly vertexSource: string;
  /** GLSL fragment shader source (#version 300 es). */
  readonly fragmentSource: string;
  /** Per-instance attributes (all divisor 1). Corner is always at location 0, divisor 0. */
  readonly attributes: readonly InstancedAttributeDescriptor[];
  /** Total byte stride per instance. */
  readonly stride: number;
  /** Names of uniforms to look up after linking. */
  readonly uniformNames?: readonly string[];
  /** Optional texture source (bound to TEXTURE0, uniform "uTexture"). */
  readonly textureSource?: TextureSourceData;
};

/** Camera state passed to {@link InstancedBucket.draw}. */
export type InstancedDrawCamera = {
  readonly x: number;
  readonly y: number;
  readonly zoom: number;
  readonly viewportWidth: number;
  readonly viewportHeight: number;
};

const CORNER_VERTICES = new Float32Array([0, 1, 1, 1, 0, 0, 1, 0]);

/**
 * A GPU bucket that renders N instanced quads with a custom vertex/fragment shader.
 *
 * Each instance is a single corner-quad (TRIANGLE_STRIP, 4 vertices). The corner
 * buffer is always at attribute location 0 with divisor 0. User-defined per-instance
 * attributes use divisor 1.
 *
 * Data is uploaded via {@link setData} (full replacement) or {@link updateRange}
 * (partial update). The bucket does not own the data — the caller is responsible
 * for managing upload timing.
 */
export class InstancedBucket {
  readonly #gl: WebGL2RenderingContext;
  readonly #program: WebGLProgram;
  readonly #vertexArray: WebGLVertexArrayObject;
  readonly #instanceBuffer: WebGLBuffer;
  readonly #cornerBuffer: WebGLBuffer;
  readonly #attributes: readonly InstancedAttributeDescriptor[];
  readonly #stride: number;
  readonly #texture: WebGLTexture | null;
  readonly #uniforms: ReadonlyMap<string, WebGLUniformLocation | null>;

  #instanceCount = 0;
  #allocatedCapacity = 0;

  constructor(
    gl: WebGL2RenderingContext,
    descriptor: InstancedBucketDescriptor,
    gpuTextureManager: GPUTextureManager,
  ) {
    this.#gl = gl;
    this.#attributes = descriptor.attributes;
    this.#stride = descriptor.stride;

    const compiler = new ShaderCompiler(gl);
    const vertexShader = compiler.compile(gl.VERTEX_SHADER, descriptor.vertexSource, "instanced-bucket.vert");
    const fragmentShader = compiler.compile(gl.FRAGMENT_SHADER, descriptor.fragmentSource, "instanced-bucket.frag");
    this.#program = compiler.createProgram(vertexShader, fragmentShader);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);

    const cornerBuffer = gl.createBuffer();
    const instanceBuffer = gl.createBuffer();
    const vertexArray = gl.createVertexArray();
    invariant(cornerBuffer, "Failed to create instanced bucket corner buffer");
    invariant(instanceBuffer, "Failed to create instanced bucket instance buffer");
    invariant(vertexArray, "Failed to create instanced bucket vertex array");

    this.#cornerBuffer = cornerBuffer;
    this.#instanceBuffer = instanceBuffer;
    this.#vertexArray = vertexArray;

    gl.bindBuffer(gl.ARRAY_BUFFER, cornerBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, CORNER_VERTICES, gl.STATIC_DRAW);

    this.#configureVertexArray(gl, vertexArray, instanceBuffer);

    this.#uniforms = resolveUniforms(gl, this.#program, descriptor.uniformNames);

    this.#texture = descriptor.textureSource
      ? gpuTextureManager.getOrCreateTexture(descriptor.textureSource)
      : null;
  }

  /** Number of instances currently held by this bucket. */
  get instanceCount(): number {
    return this.#instanceCount;
  }

  /** The compiled WebGL program. Use for setting additional uniforms outside of draw(). */
  get program(): WebGLProgram {
    return this.#program;
  }

  /** The texture bound to this bucket, or null. */
  get texture(): WebGLTexture | null {
    return this.#texture;
  }

  /**
   * Replace all instance data. Reallocates the GPU buffer if capacity changed;
   * otherwise uses {@link updateRange} for the full range.
   */
  setData(data: Float32Array, count: number): void {
    this.#instanceCount = count;
    const gl = this.#gl;
    const floatsNeeded = count * (this.#stride / Float32Array.BYTES_PER_ELEMENT);

    if (count > this.#allocatedCapacity) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.#instanceBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, data.subarray(0, floatsNeeded), gl.DYNAMIC_DRAW);
      this.#allocatedCapacity = count;
      return;
    }

    this.updateRange(data, 0, count);
  }

  /**
   * Update a contiguous range of instances. The bucket capacity must be large
   * enough (established by a prior {@link setData} call).
   */
  updateRange(data: Float32Array, startInstance: number, count: number): void {
    invariant(
      startInstance + count <= this.#instanceCount,
      `updateRange [${startInstance}, ${startInstance + count}) exceeds instance count ${this.#instanceCount}`,
    );

    const gl = this.#gl;
    const floatsPerInstance = this.#stride / Float32Array.BYTES_PER_ELEMENT;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.#instanceBuffer);
    gl.bufferSubData(
      gl.ARRAY_BUFFER,
      startInstance * this.#stride,
      data,
      startInstance * floatsPerInstance,
      count * floatsPerInstance,
    );
  }

  /**
   * Draw all instances with the given camera state and optional custom uniforms.
   *
   * Camera uniforms are set automatically if present: `uViewport`, `uCameraPosition`,
   * `uCameraZoom`. Other uniforms must be passed in `extra`.
   */
  draw(camera: InstancedDrawCamera, extra?: Record<string, number | Iterable<number>>): void {
    if (this.#instanceCount === 0) {
      return;
    }

    const gl = this.#gl;
    gl.useProgram(this.#program);
    gl.bindVertexArray(this.#vertexArray);

    this.#applyCameraUniforms(gl, camera);

    if (extra) {
      for (const [name, value] of Object.entries(extra)) {
        const location = this.#uniforms.get(name);
        if (location === undefined || location === null) {
          continue;
        }

        if (typeof value === "number") {
          gl.uniform1f(location, value);
        } else {
          const arr = Array.from(value);
          if (arr.length === 1) gl.uniform1f(location, arr[0]!);
          else if (arr.length === 2) gl.uniform2f(location, arr[0]!, arr[1]!);
          else if (arr.length === 3) gl.uniform3f(location, arr[0]!, arr[1]!, arr[2]!);
          else if (arr.length === 4) gl.uniform4f(location, arr[0]!, arr[1]!, arr[2]!, arr[3]!);
        }
      }
    }

    if (this.#texture) {
      const samplerLocation = this.#uniforms.get("uTexture");
      if (samplerLocation) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.#texture);
        gl.uniform1i(samplerLocation, 0);
      }
    }

    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, this.#instanceCount);
    gl.bindVertexArray(null);
  }

  /** Release all GPU resources owned by this bucket. */
  release(): void {
    const gl = this.#gl;
    gl.deleteProgram(this.#program);
    gl.deleteVertexArray(this.#vertexArray);
    gl.deleteBuffer(this.#instanceBuffer);
    gl.deleteBuffer(this.#cornerBuffer);
    this.#instanceCount = 0;
    this.#allocatedCapacity = 0;
  }

  #configureVertexArray(
    gl: WebGL2RenderingContext,
    vertexArray: WebGLVertexArrayObject,
    instanceBuffer: WebGLBuffer,
  ): void {
    gl.bindVertexArray(vertexArray);

    // Corner buffer (location 0, divisor 0)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.#cornerBuffer);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    // Per-instance attributes (divisor 1)
    gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuffer);
    for (const attr of this.#attributes) {
      gl.enableVertexAttribArray(attr.location);
      gl.vertexAttribPointer(
        attr.location,
        attr.size,
        gl.FLOAT,
        false,
        this.#stride,
        attr.offset,
      );
      gl.vertexAttribDivisor(attr.location, 1);
    }

    gl.bindVertexArray(null);
  }

  #applyCameraUniforms(gl: WebGL2RenderingContext, camera: InstancedDrawCamera): void {
    const viewport = this.#uniforms.get("uViewport");
    const camPos = this.#uniforms.get("uCameraPosition");
    const camZoom = this.#uniforms.get("uCameraZoom");

    if (viewport) {
      gl.uniform2f(viewport, camera.viewportWidth, camera.viewportHeight);
    }

    if (camPos) {
      gl.uniform2f(camPos, camera.x, camera.y);
    }

    if (camZoom) {
      gl.uniform1f(camZoom, camera.zoom);
    }
  }
}

function resolveUniforms(
  gl: WebGL2RenderingContext,
  program: WebGLProgram,
  names: readonly string[] | undefined,
): ReadonlyMap<string, WebGLUniformLocation | null> {
  const map = new Map<string, WebGLUniformLocation | null>();
  if (!names) {
    return map;
  }

  for (const name of names) {
    map.set(name, gl.getUniformLocation(program, name));
  }

  return map;
}
