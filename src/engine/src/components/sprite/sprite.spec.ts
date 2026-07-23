import { Rgba, Tint } from "@engine/components";
import { UserWorld, World, type WorldMutationObserver } from "@engine/ecs/world";
import { describe, expect, it, vi } from "vitest";

describe("Rgba", () => {
  it("supports minimal value mutation and copying semantics", () => {
    const color = new Rgba();

    expect(color).toMatchObject({ r: 1, g: 1, b: 1, a: 1 });
    expect(color.set(0.1, 0.2, 0.3, 0.4)).toBe(color);
    expect(color).toMatchObject({ r: 0.1, g: 0.2, b: 0.3, a: 0.4 });

    const copy = new Rgba();
    copy.copyFrom(color);
    color.r = 0.9;

    expect(copy).toMatchObject({ r: 0.1, g: 0.2, b: 0.3, a: 0.4 });
  });

  it("publishes an owning visual component once after a complete color patch", () => {
    const world = new UserWorld(new World("scene"));
    const entityChanged = vi.fn<NonNullable<WorldMutationObserver["entityChanged"]>>();
    world.observeMutations({ entityChanged });
    const entityId = world.create();
    const tint = new Tint();
    world.add(entityId, tint);
    entityChanged.mockClear();

    world.patch(entityId, Tint, (patchedTint) => {
      patchedTint.value.set(0.1, 0.2, 0.3, 0.4);
    });

    expect(entityChanged).toHaveBeenCalledOnce();
    expect(entityChanged).toHaveBeenCalledWith(world, entityId);
    expect(tint.value).toMatchObject({ r: 0.1, g: 0.2, b: 0.3, a: 0.4 });
  });

  it("copies input colors so visual components have independent ownership", () => {
    const source = new Rgba(0.2, 0.3, 0.4, 0.5);
    const first = new Tint(source);
    const second = new Tint(source);

    expect(first.value).not.toBe(source);
    expect(second.value).not.toBe(source);
    expect(first.value).not.toBe(second.value);

    source.set(1, 1, 1, 1);
    first.value.r = 0.8;

    expect(first.value).toMatchObject({ r: 0.8, g: 0.3, b: 0.4, a: 0.5 });
    expect(second.value).toMatchObject({ r: 0.2, g: 0.3, b: 0.4, a: 0.5 });
  });

  it("copies replacement values into the stable component-owned color", () => {
    const world = new UserWorld(new World("scene"));
    const entityChanged = vi.fn<NonNullable<WorldMutationObserver["entityChanged"]>>();
    world.observeMutations({ entityChanged });
    const entityId = world.create();
    const tint = new Tint(new Rgba(0, 0, 0, 1));
    const ownedColor = tint.value;
    world.add(entityId, tint);
    entityChanged.mockClear();

    const replacement = new Rgba(0.25, 0.5, 0.75, 0.9);
    world.patch(entityId, Tint, (patchedTint) => {
      patchedTint.value = replacement;
    });

    expect(tint.value).toBe(ownedColor);
    expect(tint.value).not.toBe(replacement);
    expect(tint.value).toMatchObject({ r: 0.25, g: 0.5, b: 0.75, a: 0.9 });
    expect(entityChanged).toHaveBeenCalledOnce();
  });
});
