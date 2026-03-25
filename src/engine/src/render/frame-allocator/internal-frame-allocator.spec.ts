import { describe, expect, it } from "vitest";

import { createPoolFactory } from "@engine";
import { InternalFrameAllocator, type FrameAllocatorRegistry } from "@engine/render";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/

type TestItem = {
  value: number;
};

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

describe("InternalFrameAllocator", () => {
  it("reuses dense allocated slots across frames", () => {
    let createdCount = 0;

    const allocator = new InternalFrameAllocator({
      "test:item": createPoolFactory(
        (): TestItem => {
          createdCount += 1;
          return { value: -1 };
        },
        (value: TestItem, nextValue: number) => {
          value.value = nextValue;
        },
      ),
    } satisfies FrameAllocatorRegistry);

    const first = allocator.acquire("test:item", 1);
    const second = allocator.acquire("test:item", 2);

    expect(createdCount).toBe(2);
    expect(first).not.toBe(second);
    expect(first.value).toBe(1);
    expect(second.value).toBe(2);

    allocator.reset();

    const firstReused = allocator.acquire("test:item", 3);
    const secondReused = allocator.acquire("test:item", 4);

    expect(createdCount).toBe(2);
    expect(firstReused).toBe(first);
    expect(secondReused).toBe(second);
    expect(firstReused.value).toBe(3);
    expect(secondReused.value).toBe(4);
  });
});
