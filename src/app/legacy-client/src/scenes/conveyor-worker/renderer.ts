/**
 * Instanced-bucket renderer for conveyor belt items.
 *
 * Uses the engine's `InstancedBucket` API to render items as instanced quads.
 * Two draw calls: one for belts (static), one for items (dynamic, worker-produced positions).
 */

import type { InstancedBucket, InstancedBucketDescriptor, Renderer } from "@engine/render";
import type { TextureSourceData } from "@engine/components";

// ── Shader sources ──────────────────────────────────────────────────────────

const ITEM_VERTEX = `#version 300 es
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

const FRAGMENT = `#version 300 es
precision mediump float;

uniform sampler2D uTexture;
in vec2 vUv;
out vec4 outColor;

void main() {
  outColor = texture(uTexture, vUv);
}
`;

const ITEM_STRIDE = 4 * Float32Array.BYTES_PER_ELEMENT; // prevX, prevY, currX, currY
const ITEM_UNIFORMS = [
  "uViewport", "uCameraPosition", "uCameraZoom", "uSize", "uUvRect", "uInterpolationAlpha", "uTexture",
] as const;

export type ConveyorItemTypeConfig = {
  itemSize: number;
  image: TextureSourceData;
  /** 4 floats: [u0, v0, u1, v1] */
  uvRect: Float32Array;
};

export class ConveyorItemRenderer {
  private bucket: InstancedBucket | null = null;
  private prevSnapshot: Float32Array | null = null;
  private currSnapshot: Float32Array | null = null;
  private itemCount = 0;
  private hasPositions = false;

  constructor(
    private readonly itemType: ConveyorItemTypeConfig,
  ) {}

  get isReady(): boolean {
    return this.bucket !== null;
  }

  /** Create the instanced bucket via the engine renderer. */
  initialize(renderer: Renderer): void {
    if (this.bucket) {
      return;
    }

    const descriptor: InstancedBucketDescriptor = {
      vertexSource: ITEM_VERTEX,
      fragmentSource: FRAGMENT,
      attributes: [
        { location: 1, size: 2, offset: 0 },
        { location: 2, size: 2, offset: 2 * Float32Array.BYTES_PER_ELEMENT },
      ],
      stride: ITEM_STRIDE,
      uniformNames: [...ITEM_UNIFORMS],
      textureSource: this.itemType.image,
    };

    this.bucket = renderer.createInstancedBucket(descriptor);
  }

  /** Publish a new snapshot from the worker. */
  publishSnapshot(positions: Float32Array, itemCount: number): void {
    if (!this.hasPositions) {
      // First snapshot: write to both prev and current
      this.prevSnapshot = positions;
      this.currSnapshot = positions;
      this.hasPositions = true;
    } else {
      // Shift: prev ← curr, curr ← new
      this.prevSnapshot = this.currSnapshot;
      this.currSnapshot = positions;
    }

    this.itemCount = itemCount;
  }

  /** Draw all items. */
  draw(
    renderer: Renderer,
    interpolationAlpha: number,
  ): void {
    const bucket = this.bucket;
    if (!bucket || !this.currSnapshot || this.itemCount === 0) {
      return;
    }

    // Build interleaved buffer: [prevX, prevY, currX, currY] × itemCount
    const prev = this.prevSnapshot ?? this.currSnapshot;
    const curr = this.currSnapshot;
    const interleaved = new Float32Array(this.itemCount * 4);

    for (let i = 0; i < this.itemCount; i++) {
      const bi = i * 4;
      const si = i * 2;
      interleaved[bi] = prev[si] ?? curr[si] ?? 0;
      interleaved[bi + 1] = prev[si + 1] ?? curr[si + 1] ?? 0;
      interleaved[bi + 2] = curr[si] ?? 0;
      interleaved[bi + 3] = curr[si + 1] ?? 0;
    }

    bucket.setData(interleaved, this.itemCount);

    const camera = {
      x: renderer.getCameraX(),
      y: renderer.getCameraY(),
      zoom: renderer.getCameraZoom(),
      viewportWidth: renderer.getWidth(),
      viewportHeight: renderer.getHeight(),
    };

    bucket.draw(camera, {
      uSize: [this.itemType.itemSize, this.itemType.itemSize],
      uInterpolationAlpha: interpolationAlpha,
      uUvRect: [
        this.itemType.uvRect[0] ?? 0,
        this.itemType.uvRect[1] ?? 0,
        this.itemType.uvRect[2] ?? 1,
        this.itemType.uvRect[3] ?? 1,
      ],
    });
  }

  /** Release GPU resources. */
  release(): void {
    this.bucket?.release();
    this.bucket = null;
    this.prevSnapshot = null;
    this.currSnapshot = null;
    this.itemCount = 0;
    this.hasPositions = false;
  }
}
