import { Rgba } from "@engine/components/sprite/sprite";
import { EntityIdAllocator } from "@engine/ecs/entity";
import {
  RETAINED_SPRITE_INSTANCE_FLOATS,
  type RetainedSpriteRenderData,
  RetainedSpriteStore,
} from "@engine/render/renderers/webGL/retained-sprite-store";
import { describe, expect, it } from "vitest";

// The retained store only reads image dimensions; browser image behavior is outside this unit's responsibility.
const TEST_IMAGE = { width: 128, height: 64 } as HTMLImageElement;

describe("RetainedSpriteStore", () => {
  it("does not dirty an existing slot when its render data is identical", () => {
    const store = new RetainedSpriteStore();
    const data = createRenderData();

    expect(store.upsert(1, data)).toBe(true);
    expect(store.consumeDirtyRange()).toEqual({
      startSlot: 0,
      slotCount: 1,
      coversAllActiveSlots: true,
      storageResized: true,
    });

    expect(store.upsert(1, data)).toBe(false);
    expect(store.consumeDirtyRange()).toBeNull();
  });

  it("reports the exact dirty slot for a single update", () => {
    const store = createPopulatedStore(3);

    expect(store.upsert(2, createRenderData({ currentX: 20 }))).toBe(true);
    expect(store.consumeDirtyRange()).toEqual({
      startSlot: 1,
      slotCount: 1,
      coversAllActiveSlots: false,
      storageResized: false,
    });
  });

  it("coalesces adjacent dirty slots into one range", () => {
    const store = createPopulatedStore(5);

    store.upsert(2, createRenderData({ currentX: 20 }));
    store.upsert(3, createRenderData({ currentX: 30 }));

    expect(store.consumeDirtyRange()).toEqual({
      startSlot: 1,
      slotCount: 2,
      coversAllActiveSlots: false,
      storageResized: false,
    });
  });

  it("encloses non-adjacent dirty slots in one min/max span", () => {
    const store = createPopulatedStore(5);

    store.upsert(2, createRenderData({ currentX: 20 }));
    store.upsert(4, createRenderData({ currentX: 40 }));

    expect(store.consumeDirtyRange()).toEqual({
      startSlot: 1,
      slotCount: 3,
      coversAllActiveSlots: false,
      storageResized: false,
    });
  });

  it("tracks a repeatedly changed slot only once before consumption", () => {
    const store = createPopulatedStore(4);

    store.upsert(2, createRenderData({ currentX: 20 }));
    store.upsert(2, createRenderData({ currentX: 21 }));

    expect(store.consumeDirtyRange()).toEqual({
      startSlot: 1,
      slotCount: 1,
      coversAllActiveSlots: false,
      storageResized: false,
    });
  });

  it("grows geometrically and retains existing slot data", () => {
    const store = new RetainedSpriteStore();

    for (let instanceId = 1; instanceId <= 16; instanceId += 1) {
      store.upsert(instanceId, createRenderData({ currentX: instanceId }));
    }
    store.consumeDirtyRange();

    expect(store.capacity).toBe(16);
    expect(store.upsert(17, createRenderData({ currentX: 17 }))).toBe(true);
    expect(store.capacity).toBe(32);
    expect(store.data[2]).toBe(1);
    expect(store.data[16 * RETAINED_SPRITE_INSTANCE_FLOATS + 2]).toBe(17);
    expect(store.consumeDirtyRange()).toEqual({
      startSlot: 0,
      slotCount: 17,
      coversAllActiveSlots: true,
      storageResized: true,
    });
  });

  it("swap-removes densely and keeps the moved instance ID mapped to its new slot", () => {
    const store = new RetainedSpriteStore();
    store.upsert(10, createRenderData({ currentX: 10 }));
    store.upsert(20, createRenderData({ currentX: 20 }));
    store.upsert(30, createRenderData({ currentX: 30 }));
    store.upsert(40, createRenderData({ currentX: 40 }));
    store.upsert(50, createRenderData({ currentX: 50 }));
    store.consumeDirtyRange();

    expect(store.remove(20)).toBe(true);
    expect(store.count).toBe(4);
    expect(store.has(20)).toBe(false);
    expect(store.has(50)).toBe(true);
    expect(store.data[RETAINED_SPRITE_INSTANCE_FLOATS + 2]).toBe(50);
    expect(store.consumeDirtyRange()).toEqual({
      startSlot: 1,
      slotCount: 1,
      coversAllActiveSlots: false,
      storageResized: false,
    });

    expect(store.upsert(50, createRenderData({ currentX: 500 }))).toBe(true);
    expect(store.data[RETAINED_SPRITE_INSTANCE_FLOATS + 2]).toBe(500);
    expect(store.data[4 * RETAINED_SPRITE_INSTANCE_FLOATS + 2]).toBe(50);
    expect(store.consumeDirtyRange()).toEqual({
      startSlot: 1,
      slotCount: 1,
      coversAllActiveSlots: false,
      storageResized: false,
    });
  });

  it("keys retained instances by the complete EntityId", () => {
    const firstId = new EntityIdAllocator(7).create();
    const sameFormerIndex = new EntityIdAllocator(7 + 2 ** 32).create();
    const store = new RetainedSpriteStore();

    store.upsert(firstId, createRenderData({ currentX: 7 }));
    store.upsert(sameFormerIndex, createRenderData({ currentX: 70 }));

    expect(store.count).toBe(2);
    expect(store.has(firstId)).toBe(true);
    expect(store.has(sameFormerIndex)).toBe(true);

    store.remove(firstId);
    expect(store.has(firstId)).toBe(false);
    expect(store.has(sameFormerIndex)).toBe(true);
    expect(store.data[2]).toBe(70);
  });
});

function createPopulatedStore(count: number): RetainedSpriteStore {
  const store = new RetainedSpriteStore();
  for (let instanceId = 1; instanceId <= count; instanceId += 1) {
    store.upsert(instanceId, createRenderData());
  }
  store.consumeDirtyRange();
  return store;
}

function createRenderData(overrides: Partial<RetainedSpriteRenderData> = {}): RetainedSpriteRenderData {
  return {
    image: TEST_IMAGE,
    previousX: 0,
    previousY: 0,
    currentX: 0,
    currentY: 0,
    width: 16,
    height: 8,
    rotation: 0,
    anchorX: 0.5,
    anchorY: 0.5,
    flipScaleX: 1,
    flipScaleY: 1,
    sourceX: 0,
    sourceY: 0,
    sourceWidth: 16,
    sourceHeight: 8,
    tint: new Rgba(1, 1, 1, 1),
    ...overrides,
  };
}
