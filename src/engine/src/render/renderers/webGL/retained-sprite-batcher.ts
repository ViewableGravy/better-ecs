import { GPUTextureManager } from "@engine/render/renderers/webGL/gpu-texture-manager";
import { registry } from "@engine/render/renderers/webGL/registry";
import {
  RETAINED_SPRITE_INSTANCE_FLOATS,
  RetainedSpriteStore,
  type RetainedSpriteRenderData,
} from "@engine/render/renderers/webGL/retained-sprite-store";
import invariant from "tiny-invariant";

type RetainedSpriteBucket = {
  readonly store: RetainedSpriteStore;
  readonly texture: WebGLTexture;
  readonly buffer: WebGLBuffer;
  readonly vertexArray: WebGLVertexArrayObject;
  allocatedCapacity: number;
};

export type RetainedSpriteDrawContext = {
  readonly interpolationAlpha: number;
  readonly cameraX: number;
  readonly cameraY: number;
  readonly cameraZoom: number;
  readonly viewportWidth: number;
  readonly viewportHeight: number;
};

/**
 * Owns persistent CPU/GPU sprite batches for the WebGL renderer.
 *
 * ECS projection and render ordering stay outside this class. It accepts stable
 * logical instance IDs and maintains dense physical slots internally.
 */
export class WebGLRetainedSpriteBatcher {
  #gl: WebGL2RenderingContext | null = null;
  #gpuTextureManager: GPUTextureManager | null = null;
  readonly #buckets = new Map<number, RetainedSpriteBucket>();
  readonly #beforeDraw: () => void;

  constructor(beforeDraw: () => void) {
    this.#beforeDraw = beforeDraw;
  }

  initialize(gl: WebGL2RenderingContext, gpuTextureManager: GPUTextureManager): void {
    this.#gl = gl;
    this.#gpuTextureManager = gpuTextureManager;
  }

  upsert(bucketId: number, instanceId: number, data: RetainedSpriteRenderData): void {
    this.#resolveBucket(bucketId, data.image).store.upsert(instanceId, data);
  }

  remove(bucketId: number, instanceId: number): void {
    this.#buckets.get(bucketId)?.store.remove(instanceId);
  }

  draw(bucketId: number, context: RetainedSpriteDrawContext): void {
    this.#beforeDraw();

    const gl = this.#gl;
    const bucket = this.#buckets.get(bucketId);
    if (!gl || !bucket || bucket.store.count === 0) {
      return;
    }

    const spriteProgram = registry.get("retainedSprite");
    gl.useProgram(spriteProgram.program);
    gl.bindVertexArray(bucket.vertexArray);
    gl.bindBuffer(gl.ARRAY_BUFFER, bucket.buffer);
    this.#uploadDirtyData(gl, bucket);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, bucket.texture);

    if (spriteProgram.samplerLocation) {
      gl.uniform1i(spriteProgram.samplerLocation, 0);
    }
    if (spriteProgram.viewportLocation) {
      gl.uniform2f(spriteProgram.viewportLocation, context.viewportWidth, context.viewportHeight);
    }
    if (spriteProgram.cameraPositionLocation) {
      gl.uniform2f(spriteProgram.cameraPositionLocation, context.cameraX, context.cameraY);
    }
    if (spriteProgram.cameraZoomLocation) {
      gl.uniform1f(spriteProgram.cameraZoomLocation, context.cameraZoom);
    }
    if (spriteProgram.interpolationAlphaLocation) {
      gl.uniform1f(spriteProgram.interpolationAlphaLocation, context.interpolationAlpha);
    }

    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, bucket.store.count);
    gl.bindVertexArray(null);
  }

  release(bucketId: number): void {
    const gl = this.#gl;
    const bucket = this.#buckets.get(bucketId);
    if (!gl || !bucket) {
      return;
    }

    gl.deleteVertexArray(bucket.vertexArray);
    gl.deleteBuffer(bucket.buffer);
    this.#buckets.delete(bucketId);
  }

  #uploadDirtyData(gl: WebGL2RenderingContext, bucket: RetainedSpriteBucket): void {
    const dirtyRange = bucket.store.consumeDirtyRange();
    if (dirtyRange?.storageResized || bucket.allocatedCapacity !== bucket.store.capacity) {
      gl.bufferData(
        gl.ARRAY_BUFFER,
        bucket.store.capacity * RETAINED_SPRITE_INSTANCE_FLOATS * Float32Array.BYTES_PER_ELEMENT,
        gl.DYNAMIC_DRAW,
      );
      bucket.allocatedCapacity = bucket.store.capacity;

      if (bucket.store.count > 0) {
        gl.bufferSubData(
          gl.ARRAY_BUFFER,
          0,
          bucket.store.data,
          0,
          bucket.store.count * RETAINED_SPRITE_INSTANCE_FLOATS,
        );
      }
      return;
    }

    if (!dirtyRange || dirtyRange.slotCount === 0) {
      return;
    }

    gl.bufferSubData(
      gl.ARRAY_BUFFER,
      dirtyRange.startSlot * RETAINED_SPRITE_INSTANCE_FLOATS * Float32Array.BYTES_PER_ELEMENT,
      bucket.store.data,
      dirtyRange.startSlot * RETAINED_SPRITE_INSTANCE_FLOATS,
      dirtyRange.slotCount * RETAINED_SPRITE_INSTANCE_FLOATS,
    );
  }

  #resolveBucket(
    bucketId: number,
    image: HTMLImageElement | ImageBitmap | HTMLCanvasElement,
  ): RetainedSpriteBucket {
    const existing = this.#buckets.get(bucketId);
    if (existing) {
      return existing;
    }

    const gl = this.#gl;
    const gpuTextureManager = this.#gpuTextureManager;
    invariant(gl, "WebGL context is not initialized");
    invariant(gpuTextureManager, "GPU texture manager is not initialized");

    const texture = gpuTextureManager.getOrCreateTexture(image);
    const buffer = gl.createBuffer();
    const vertexArray = gl.createVertexArray();
    invariant(texture, "Failed to create retained sprite texture");
    invariant(buffer, "Failed to create retained sprite buffer");
    invariant(vertexArray, "Failed to create retained sprite vertex array");

    const spriteProgram = registry.get("retainedSprite");
    const stride = RETAINED_SPRITE_INSTANCE_FLOATS * Float32Array.BYTES_PER_ELEMENT;
    gl.bindVertexArray(vertexArray);
    gl.bindBuffer(gl.ARRAY_BUFFER, spriteProgram.cornerBuffer);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

    configureAttribute(gl, 1, 2, stride, 0);
    configureAttribute(gl, 2, 2, stride, 2);
    configureAttribute(gl, 3, 2, stride, 4);
    configureAttribute(gl, 4, 1, stride, 6);
    configureAttribute(gl, 5, 2, stride, 7);
    configureAttribute(gl, 6, 2, stride, 9);
    configureAttribute(gl, 7, 4, stride, 11);
    configureAttribute(gl, 8, 4, stride, 15);
    gl.bindVertexArray(null);

    const created: RetainedSpriteBucket = {
      store: new RetainedSpriteStore(),
      texture,
      buffer,
      vertexArray,
      allocatedCapacity: 0,
    };
    this.#buckets.set(bucketId, created);
    return created;
  }
}

function configureAttribute(
  gl: WebGL2RenderingContext,
  location: number,
  size: number,
  stride: number,
  floatOffset: number,
): void {
  gl.enableVertexAttribArray(location);
  gl.vertexAttribPointer(
    location,
    size,
    gl.FLOAT,
    false,
    stride,
    floatOffset * Float32Array.BYTES_PER_ELEMENT,
  );
  gl.vertexAttribDivisor(location, 1);
}
