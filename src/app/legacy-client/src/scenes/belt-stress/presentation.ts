import {
    BELT_STRESS_BELT_SIZE,
    BELT_STRESS_ITEM_SIZE,
    BELT_STRESS_UPS,
} from "@legacy/scenes/belt-stress/config";
import type { BeltStressRendererConfiguration, BeltStressRendererMetrics } from "@legacy/scenes/belt-stress/render/BeltStressRenderer";
import type { InstancedBucket, InstancedBucketDescriptor, Renderer } from "@engine/render";
import invariant from "tiny-invariant";

type PendingSnapshot = {
  readonly positions: Float32Array;
  readonly tick: number;
  readonly receivedAt: number;
  readonly release: () => void;
};

export type BeltStressPresentationMetrics = BeltStressRendererMetrics & {
  readonly renderedTick: number;
  readonly frameIntervalMs: number;
};

/**********************************************************************************************************
 *   SHADER SOURCES
 **********************************************************************************************************/

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

const ITEM_STRIDE = 4 * Float32Array.BYTES_PER_ELEMENT; // 2 vec2 attributes = 16 bytes
const BELT_STRIDE = 2 * Float32Array.BYTES_PER_ELEMENT; // 1 vec2 attribute = 8 bytes

const BELT_UNIFORM_NAMES = [
  "uViewport", "uCameraPosition", "uCameraZoom", "uSize", "uUvRect", "uTexture",
] as const;

const ITEM_UNIFORM_NAMES = [
  "uViewport", "uCameraPosition", "uCameraZoom", "uSize", "uUvRect", "uInterpolationAlpha", "uTexture",
] as const;

/**********************************************************************************************************
 *   PRESENTATION CLASS
 **********************************************************************************************************/

class BeltStressPresentation {
  #beltBucket: InstancedBucket | null = null;
  #itemBucket: InstancedBucket | null = null;

  #beltConfig: {
    positions: Float32Array;
    image: BeltStressRendererConfiguration["beltImage"];
    frameUvRects: Float32Array;
  } | null = null;

  #itemConfig: {
    count: number;
    image: BeltStressRendererConfiguration["itemImage"];
    uvRect: Float32Array;
  } | null = null;

  #pendingSnapshot: PendingSnapshot | undefined;
  #renderedTick = 0;
  #snapshotReceivedAt = 0;
  #lastDrawAt = 0;
  #frameIntervalMs = 0;

  #uploadedBytes = 0;
  #uploadCount = 0;
  #lastUploadMs = 0;
  #drawCalls = 0;
  #lastDrawSubmissionMs = 0;

  #previousBufferIndex: 0 | 1 = 0;
  #currentBufferIndex: 0 | 1 = 1;
  #hasPositions = false;
  /** Persistent interleaved buffer: [prevX, prevY, currX, currY] per item. */
  #interleavedBuffer: Float32Array | null = null;

  public configure(configuration: BeltStressRendererConfiguration): void {
    this.#beltConfig = {
      positions: configuration.beltPositions,
      image: configuration.beltImage,
      frameUvRects: configuration.beltFrameUvRects,
    };

    this.#itemConfig = {
      count: configuration.itemCount,
      image: configuration.itemImage,
      uvRect: configuration.itemUvRect,
    };

    this.#hasPositions = false;
    this.#previousBufferIndex = 0;
    this.#currentBufferIndex = 1;

    // Invalidate buckets so they're recreated on next draw
    this.#beltBucket = null;
    this.#itemBucket = null;
  }

  public publish(snapshot: PendingSnapshot): void {
    this.#pendingSnapshot?.release();
    this.#pendingSnapshot = snapshot;
  }

  public draw(renderer: Renderer): void {
    const drawAt = performance.now();
    if (this.#lastDrawAt > 0) {
      const interval = drawAt - this.#lastDrawAt;
      this.#frameIntervalMs = this.#frameIntervalMs === 0
        ? interval
        : this.#frameIntervalMs * 0.9 + interval * 0.1;
    }
    this.#lastDrawAt = drawAt;

    this.#ensureBuckets(renderer);

    const pendingSnapshot = this.#pendingSnapshot;
    if (pendingSnapshot) {
      this.#uploadItemPositions(pendingSnapshot);
      this.#renderedTick = pendingSnapshot.tick;
      this.#snapshotReceivedAt = pendingSnapshot.receivedAt;
      pendingSnapshot.release();
      this.#pendingSnapshot = undefined;
    }

    const interpolationAlpha = Math.min(
      1,
      (performance.now() - this.#snapshotReceivedAt) / (1000 / BELT_STRESS_UPS),
    );

    const startedAt = performance.now();
    this.#drawCalls = 0;

    const camera = {
      x: renderer.getCameraX(),
      y: renderer.getCameraY(),
      zoom: renderer.getCameraZoom(),
      viewportWidth: renderer.getWidth(),
      viewportHeight: renderer.getHeight(),
    };

    this.#drawBelts(camera);
    this.#drawItems(camera, interpolationAlpha);

    this.#lastDrawSubmissionMs = performance.now() - startedAt;
  }

  public clear(): void {
    this.#pendingSnapshot?.release();
    this.#pendingSnapshot = undefined;
    this.#renderedTick = 0;
    this.#snapshotReceivedAt = 0;
    this.#lastDrawAt = 0;
    this.#frameIntervalMs = 0;
    this.#uploadedBytes = 0;
    this.#uploadCount = 0;
    this.#lastUploadMs = 0;
    this.#drawCalls = 0;
    this.#lastDrawSubmissionMs = 0;
    this.#hasPositions = false;
    this.#beltBucket = null;
    this.#itemBucket = null;
    this.#beltConfig = null;
    this.#itemConfig = null;
  }

  public metrics(): BeltStressPresentationMetrics {
    return {
      uploadedBytes: this.#uploadedBytes,
      uploadCount: this.#uploadCount,
      lastUploadMs: this.#lastUploadMs,
      drawCalls: this.#drawCalls,
      lastDrawSubmissionMs: this.#lastDrawSubmissionMs,
      renderedTick: this.#renderedTick,
      frameIntervalMs: this.#frameIntervalMs,
    };
  }

  /**********************************************************************************************************
   *   PRIVATE HELPERS
   **********************************************************************************************************/

  #ensureBuckets(renderer: Renderer): void {
    const beltConfig = this.#beltConfig;
    const itemConfig = this.#itemConfig;

    if (!this.#beltBucket && beltConfig) {
      const descriptor: InstancedBucketDescriptor = {
        vertexSource: BELT_VERTEX_SHADER,
        fragmentSource: FRAGMENT_SHADER,
        attributes: [{ location: 1, size: 2, offset: 0 }],
        stride: BELT_STRIDE,
        uniformNames: [...BELT_UNIFORM_NAMES],
        textureSource: beltConfig.image,
      };

      this.#beltBucket = renderer.createInstancedBucket(descriptor);
      // Upload belt positions (static, done once)
      this.#beltBucket.setData(beltConfig.positions, beltConfig.positions.length / 2);
    }

    if (!this.#itemBucket && itemConfig) {
      const descriptor: InstancedBucketDescriptor = {
        vertexSource: ITEM_VERTEX_SHADER,
        fragmentSource: FRAGMENT_SHADER,
        attributes: [
          { location: 1, size: 2, offset: 0 },
          { location: 2, size: 2, offset: 2 * Float32Array.BYTES_PER_ELEMENT },
        ],
        stride: ITEM_STRIDE,
        uniformNames: [...ITEM_UNIFORM_NAMES],
        textureSource: itemConfig.image,
      };

      this.#itemBucket = renderer.createInstancedBucket(descriptor);
      // Item positions are uploaded on first snapshot
    }
  }

  #uploadItemPositions(snapshot: PendingSnapshot): void {
    const itemBucket = this.#itemBucket;
    const itemConfig = this.#itemConfig;
    invariant(itemBucket, "Item bucket not created");
    invariant(itemConfig, "Item config not set");
    invariant(
      snapshot.positions.length === itemConfig.count * 2,
      `Expected ${itemConfig.count * 2} position values, received ${snapshot.positions.length}`,
    );

    const startedAt = performance.now();

    // Ensure persistent interleaved buffer
    const interleaved = this.#interleavedBuffer
      ?? (this.#interleavedBuffer = new Float32Array(itemConfig.count * 4));

    if (!this.#hasPositions) {
      // First upload: write positions to BOTH previous and current slots
      for (let i = 0; i < itemConfig.count; i += 1) {
        const base = i * 4;
        const src = i * 2;
        interleaved[base] = snapshot.positions[src]!;
        interleaved[base + 1] = snapshot.positions[src + 1]!;
        interleaved[base + 2] = snapshot.positions[src]!;
        interleaved[base + 3] = snapshot.positions[src + 1]!;
      }
      this.#hasPositions = true;
      itemBucket.setData(interleaved, itemConfig.count);
      this.#uploadedBytes += snapshot.positions.byteLength * 2;
    } else {
      // Swap prev/curr indices: old "current" becomes the new "previous"
      this.#previousBufferIndex = this.#currentBufferIndex;
      this.#currentBufferIndex = this.#currentBufferIndex === 0 ? 1 : 0;

      // Write new positions into the "current" slots
      const currOffset = this.#currentBufferIndex * 2;
      for (let i = 0; i < itemConfig.count; i += 1) {
        const base = i * 4;
        const src = i * 2;
        interleaved[base + currOffset] = snapshot.positions[src]!;
        interleaved[base + currOffset + 1] = snapshot.positions[src + 1]!;
      }

      // Upload the full interleaved buffer (could optimize to only upload changed range)
      itemBucket.updateRange(interleaved, 0, itemConfig.count);
      this.#uploadedBytes += interleaved.byteLength;
    }

    this.#uploadCount += 1;
    this.#lastUploadMs = performance.now() - startedAt;
  }

  #drawBelts(camera: {
    readonly x: number;
    readonly y: number;
    readonly zoom: number;
    readonly viewportWidth: number;
    readonly viewportHeight: number;
  }): void {
    const beltBucket = this.#beltBucket;
    const beltConfig = this.#beltConfig;
    if (!beltBucket || !beltConfig || beltBucket.instanceCount === 0) {
      return;
    }

    const frameCount = beltConfig.frameUvRects.length / 4;
    const frameIndex = Math.floor(this.#renderedTick * 0.5) % frameCount;
    const uvOffset = frameIndex * 4;

    beltBucket.draw(camera, {
      uSize: [BELT_STRESS_BELT_SIZE, BELT_STRESS_BELT_SIZE],
      uUvRect: [
        beltConfig.frameUvRects[uvOffset]!,
        beltConfig.frameUvRects[uvOffset + 1]!,
        beltConfig.frameUvRects[uvOffset + 2]!,
        beltConfig.frameUvRects[uvOffset + 3]!,
      ],
    });

    this.#drawCalls += 1;
  }

  #drawItems(
    camera: {
      readonly x: number;
      readonly y: number;
      readonly zoom: number;
      readonly viewportWidth: number;
      readonly viewportHeight: number;
    },
    interpolationAlpha: number,
  ): void {
    const itemBucket = this.#itemBucket;
    const itemConfig = this.#itemConfig;
    if (!itemBucket || !itemConfig || itemBucket.instanceCount === 0) {
      return;
    }

    itemBucket.draw(camera, {
      uSize: [BELT_STRESS_ITEM_SIZE, BELT_STRESS_ITEM_SIZE],
      uInterpolationAlpha: interpolationAlpha,
      uUvRect: [
        itemConfig.uvRect[0]!,
        itemConfig.uvRect[1]!,
        itemConfig.uvRect[2]!,
        itemConfig.uvRect[3]!,
      ],
    });

    this.#drawCalls += 1;
  }
}

export const beltStressPresentation = new BeltStressPresentation();
