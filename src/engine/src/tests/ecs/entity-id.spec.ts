import { describe, expect, it } from "vitest";

import { EntityIdAllocator, isEntityId } from "@engine/ecs/entity";
import { ComponentStore } from "@engine/ecs/storage";
import { UserWorld, World } from "@engine/ecs/world";

describe("Entity IDs", () => {
  it("allocates beyond the old 20-bit ceiling", () => {
    const allocator = new EntityIdAllocator(5_000_000);

    expect(allocator.create()).toBe(5_000_000);
    expect(allocator.nextEntityId).toBe(5_000_001);
  });

  it("never reuses a destroyed ID", () => {
    const world = new UserWorld(new World("scene"));
    const destroyed = world.create();

    world.destroy(destroyed);

    const replacement = world.create();
    expect(replacement).toBeGreaterThan(destroyed);
  });

  it("keys component stores by the full ID", () => {
    const firstId = new EntityIdAllocator(7).create();
    const sameFormerIndex = new EntityIdAllocator(7 + 2 ** 20).create();
    const store = new ComponentStore<unknown>();

    store.add(firstId, "first");
    store.add(sameFormerIndex, "second");

    expect(store.count()).toBe(2);
    expect(store.get(firstId)).toBe("first");
    expect(store.get(sameFormerIndex)).toBe("second");
  });

  it("recognizes only positive safe-integer IDs", () => {
    expect(isEntityId(1)).toBe(true);
    expect(isEntityId(2 ** 32 + 1)).toBe(true);
    expect(isEntityId(0)).toBe(false);
    expect(isEntityId(-1)).toBe(false);
    expect(isEntityId(1.5)).toBe(false);
    expect(isEntityId(Number.POSITIVE_INFINITY)).toBe(false);
    expect(isEntityId(Number.MAX_SAFE_INTEGER)).toBe(false);
  });

});
