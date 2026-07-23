import type { Rgba } from "@engine/components/sprite/sprite";

export const RETAINED_SPRITE_INSTANCE_FLOATS = 19;

export type RetainedSpriteRenderData = {
  image: HTMLImageElement | ImageBitmap | HTMLCanvasElement;
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
  readonly startSlot: number;
  readonly slotCount: number;
  readonly coversAllActiveSlots: boolean;
  readonly storageResized: boolean;
};

const INITIAL_CAPACITY = 16;

/**
 * Dense CPU shadow storage for one retained sprite bucket.
 *
 * Logical instance IDs remain stable while physical slots use swap-remove so
 * WebGL can always draw one contiguous active range.
 */
export class RetainedSpriteStore {
  #data = new Float32Array(INITIAL_CAPACITY * RETAINED_SPRITE_INSTANCE_FLOATS);
  readonly #instanceIds: number[] = [];
  readonly #slotsByInstanceId = new Map<number, number>();
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
    const startSlot = this.#storageResized ? 0 : Math.min(this.#dirtyStart, count);
    const endSlot = this.#storageResized ? count : Math.min(this.#dirtyEnd + 1, count);
    const slotCount = Math.max(0, endSlot - startSlot);
    const result: RetainedSpriteDirtyRange = {
      startSlot,
      slotCount,
      coversAllActiveSlots: startSlot === 0 && slotCount === count,
      storageResized: this.#storageResized,
    };

    this.#dirtyStart = Number.POSITIVE_INFINITY;
    this.#dirtyEnd = -1;
    this.#storageResized = false;
    return result;
  }

  #writeIfChanged(slot: number, value: RetainedSpriteRenderData): boolean {
    const base = slot * RETAINED_SPRITE_INSTANCE_FLOATS;
    if (retainedSpriteDataMatches(this.#data, base, value)) {
      return false;
    }

    writeRetainedSpriteData(this.#data, slot, value);
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

function retainedSpriteDataMatches(
  target: Float32Array,
  base: number,
  value: RetainedSpriteRenderData,
): boolean {
  const imageWidth = value.image.width > 0 ? value.image.width : 1;
  const imageHeight = value.image.height > 0 ? value.image.height : 1;
  const frameWidth = value.sourceWidth > 0 ? value.sourceWidth : imageWidth;
  const frameHeight = value.sourceHeight > 0 ? value.sourceHeight : imageHeight;
  const insetX = frameWidth > 1 ? 0.5 : 0;
  const insetY = frameHeight > 1 ? 0.5 : 0;

  return target[base] === value.previousX
    && target[base + 1] === value.previousY
    && target[base + 2] === value.currentX
    && target[base + 3] === value.currentY
    && target[base + 4] === value.width
    && target[base + 5] === value.height
    && target[base + 6] === value.rotation
    && target[base + 7] === value.anchorX
    && target[base + 8] === value.anchorY
    && target[base + 9] === value.flipScaleX
    && target[base + 10] === value.flipScaleY
    && target[base + 11] === (value.sourceX + insetX) / imageWidth
    && target[base + 12] === (value.sourceY + insetY) / imageHeight
    && target[base + 13] === (value.sourceX + frameWidth - insetX) / imageWidth
    && target[base + 14] === (value.sourceY + frameHeight - insetY) / imageHeight
    && target[base + 15] === value.tint.r
    && target[base + 16] === value.tint.g
    && target[base + 17] === value.tint.b
    && target[base + 18] === value.tint.a;
}

function writeRetainedSpriteData(
  target: Float32Array,
  slot: number,
  value: RetainedSpriteRenderData,
): void {
  const base = slot * RETAINED_SPRITE_INSTANCE_FLOATS;
  const imageWidth = value.image.width > 0 ? value.image.width : 1;
  const imageHeight = value.image.height > 0 ? value.image.height : 1;
  const frameWidth = value.sourceWidth > 0 ? value.sourceWidth : imageWidth;
  const frameHeight = value.sourceHeight > 0 ? value.sourceHeight : imageHeight;
  const insetX = frameWidth > 1 ? 0.5 : 0;
  const insetY = frameHeight > 1 ? 0.5 : 0;

  target[base] = value.previousX;
  target[base + 1] = value.previousY;
  target[base + 2] = value.currentX;
  target[base + 3] = value.currentY;
  target[base + 4] = value.width;
  target[base + 5] = value.height;
  target[base + 6] = value.rotation;
  target[base + 7] = value.anchorX;
  target[base + 8] = value.anchorY;
  target[base + 9] = value.flipScaleX;
  target[base + 10] = value.flipScaleY;
  target[base + 11] = (value.sourceX + insetX) / imageWidth;
  target[base + 12] = (value.sourceY + insetY) / imageHeight;
  target[base + 13] = (value.sourceX + frameWidth - insetX) / imageWidth;
  target[base + 14] = (value.sourceY + frameHeight - insetY) / imageHeight;
  target[base + 15] = value.tint.r;
  target[base + 16] = value.tint.g;
  target[base + 17] = value.tint.b;
  target[base + 18] = value.tint.a;
}

function copyRetainedSpriteSlot(target: Float32Array, sourceSlot: number, destinationSlot: number): void {
  const sourceBase = sourceSlot * RETAINED_SPRITE_INSTANCE_FLOATS;
  const destinationBase = destinationSlot * RETAINED_SPRITE_INSTANCE_FLOATS;

  for (let offset = 0; offset < RETAINED_SPRITE_INSTANCE_FLOATS; offset += 1) {
    target[destinationBase + offset] = target[sourceBase + offset] ?? 0;
  }
}
