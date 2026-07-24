import type { Rgba } from "@engine/components/sprite/sprite";

export const RETAINED_SPRITE_INSTANCE_FLOATS = 19;

export type RetainedSpriteAnimationData = {
  readonly frameUvRects: Float32Array;
  readonly playbackRate: number;
  readonly startTick: number;
};

export type RetainedSpriteRenderData = {
  image: HTMLImageElement | ImageBitmap | HTMLCanvasElement;
  animation?: RetainedSpriteAnimationData;
  previousX: number;
  previousY: number;
  currentX: number;
  currentY: number;
  width: number;
  height: number;
  rotation: number;
  anchorX: number;
  anchorY: number;
  flipScaleX: number;
  flipScaleY: number;
  sourceX: number;
  sourceY: number;
  sourceWidth: number;
  sourceHeight: number;
  tint: Rgba;
};

export type RetainedSpriteDirtyRange = {
  startSlot: number;
  slotCount: number;
  coversAllActiveSlots: boolean;
  storageResized: boolean;
};

const INITIAL_CAPACITY = 16;
const SHARED_PACKED_DATA = new Float32Array(RETAINED_SPRITE_INSTANCE_FLOATS);

/**
 * Dense WebGL CPU shadow storage for one retained sprite bucket.
 *
 * Logical instance IDs remain stable while physical slots use swap-remove so
 * WebGL can always draw one contiguous active range.
 */
export class RetainedSpriteStore {
  #data = new Float32Array(INITIAL_CAPACITY * RETAINED_SPRITE_INSTANCE_FLOATS);
  readonly #instanceIds: number[] = [];
  readonly #slotsByInstanceId = new Map<number, number>();
  readonly #dirtyResult: RetainedSpriteDirtyRange = {
    startSlot: 0,
    slotCount: 0,
    coversAllActiveSlots: false,
    storageResized: true,
  };
  #dirtyStart = Number.POSITIVE_INFINITY;
  #dirtyEnd = -1;
  #storageResized = true;

  get data(): Float32Array {
    return this.#data;
  }

  get count(): number {
    return this.#instanceIds.length;
  }

  get capacity(): number {
    return this.#data.length / RETAINED_SPRITE_INSTANCE_FLOATS;
  }

  has(instanceId: number): boolean {
    return this.#slotsByInstanceId.has(instanceId);
  }

  upsert(instanceId: number, value: RetainedSpriteRenderData): boolean {
    const existingSlot = this.#slotsByInstanceId.get(instanceId);
    if (existingSlot !== undefined) {
      return this.#writeIfChanged(existingSlot, value);
    }

    const slot = this.#instanceIds.length;
    this.#ensureCapacity(slot + 1);
    this.#instanceIds.push(instanceId);
    this.#slotsByInstanceId.set(instanceId, slot);
    writeRetainedSpriteData(this.#data, slot, value);
    this.#markDirty(slot);
    return true;
  }

  remove(instanceId: number): boolean {
    const removedSlot = this.#slotsByInstanceId.get(instanceId);
    if (removedSlot === undefined) {
      return false;
    }

    const lastSlot = this.#instanceIds.length - 1;
    const movedInstanceId = this.#instanceIds[lastSlot];
    this.#slotsByInstanceId.delete(instanceId);

    if (removedSlot !== lastSlot && movedInstanceId !== undefined) {
      copyRetainedSpriteSlot(this.#data, lastSlot, removedSlot);
      this.#instanceIds[removedSlot] = movedInstanceId;
      this.#slotsByInstanceId.set(movedInstanceId, removedSlot);
      this.#markDirty(removedSlot);
    }

    this.#instanceIds.pop();
    return true;
  }

  consumeDirtyRange(): RetainedSpriteDirtyRange | null {
    if (this.#dirtyEnd < this.#dirtyStart && !this.#storageResized) {
      return null;
    }

    const count = this.count;
    const storageResized = this.#storageResized;
    const startSlot = storageResized ? 0 : Math.min(this.#dirtyStart, count);
    const endSlot = storageResized ? count : Math.min(this.#dirtyEnd + 1, count);
    const slotCount = Math.max(0, endSlot - startSlot);

    this.#dirtyResult.startSlot = startSlot;
    this.#dirtyResult.slotCount = slotCount;
    this.#dirtyResult.coversAllActiveSlots = startSlot === 0 && slotCount === count;
    this.#dirtyResult.storageResized = storageResized;
    this.#dirtyStart = Number.POSITIVE_INFINITY;
    this.#dirtyEnd = -1;
    this.#storageResized = false;
    return this.#dirtyResult;
  }

  #writeIfChanged(slot: number, value: RetainedSpriteRenderData): boolean {
    const base = slot * RETAINED_SPRITE_INSTANCE_FLOATS;
    packRetainedSpriteData(SHARED_PACKED_DATA, value);
    if (slotMatches(this.#data, base, SHARED_PACKED_DATA)) {
      return false;
    }

    this.#data.set(SHARED_PACKED_DATA, base);
    this.#markDirty(slot);
    return true;
  }

  #ensureCapacity(requiredCapacity: number): void {
    if (requiredCapacity <= this.capacity) {
      return;
    }

    let capacity = this.capacity;
    while (capacity < requiredCapacity) {
      capacity *= 2;
    }

    const grown = new Float32Array(capacity * RETAINED_SPRITE_INSTANCE_FLOATS);
    grown.set(this.#data);
    this.#data = grown;
    this.#storageResized = true;
  }

  #markDirty(slot: number): void {
    this.#dirtyStart = Math.min(this.#dirtyStart, slot);
    this.#dirtyEnd = Math.max(this.#dirtyEnd, slot);
  }
}

function writeRetainedSpriteData(
  target: Float32Array,
  slot: number,
  value: RetainedSpriteRenderData,
): void {
  packRetainedSpriteData(SHARED_PACKED_DATA, value);
  target.set(SHARED_PACKED_DATA, slot * RETAINED_SPRITE_INSTANCE_FLOATS);
}

function slotMatches(target: Float32Array, base: number, packed: Float32Array): boolean {
  for (let offset = 0; offset < RETAINED_SPRITE_INSTANCE_FLOATS; offset += 1) {
    if (target[base + offset] !== packed[offset]) {
      return false;
    }
  }

  return true;
}

function packRetainedSpriteData(target: Float32Array, value: RetainedSpriteRenderData): void {
  const imageWidth = value.image.width > 0 ? value.image.width : 1;
  const imageHeight = value.image.height > 0 ? value.image.height : 1;
  const frameWidth = value.sourceWidth > 0 ? value.sourceWidth : imageWidth;
  const frameHeight = value.sourceHeight > 0 ? value.sourceHeight : imageHeight;
  const insetX = frameWidth > 1 ? 0.5 : 0;
  const insetY = frameHeight > 1 ? 0.5 : 0;

  target[0] = value.previousX;
  target[1] = value.previousY;
  target[2] = value.currentX;
  target[3] = value.currentY;
  target[4] = value.width;
  target[5] = value.height;
  target[6] = value.rotation;
  target[7] = value.anchorX;
  target[8] = value.anchorY;
  target[9] = value.flipScaleX;
  target[10] = value.flipScaleY;
  target[11] = (value.sourceX + insetX) / imageWidth;
  target[12] = (value.sourceY + insetY) / imageHeight;
  target[13] = (value.sourceX + frameWidth - insetX) / imageWidth;
  target[14] = (value.sourceY + frameHeight - insetY) / imageHeight;
  target[15] = value.tint.r;
  target[16] = value.tint.g;
  target[17] = value.tint.b;
  target[18] = value.tint.a;
}

function copyRetainedSpriteSlot(target: Float32Array, sourceSlot: number, destinationSlot: number): void {
  const sourceBase = sourceSlot * RETAINED_SPRITE_INSTANCE_FLOATS;
  const destinationBase = destinationSlot * RETAINED_SPRITE_INSTANCE_FLOATS;

  for (let offset = 0; offset < RETAINED_SPRITE_INSTANCE_FLOATS; offset += 1) {
    target[destinationBase + offset] = target[sourceBase + offset] ?? 0;
  }
}
