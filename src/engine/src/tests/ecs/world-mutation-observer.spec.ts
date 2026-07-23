import { Sprite, Transform2D } from "@engine/components";
import type { EntityId } from "@engine/ecs/entity";
import { UserWorld, World, type WorldMutationObserver } from "@engine/ecs/world";
import { describe, expect, it, vi } from "vitest";

describe("UserWorld mutation observers", () => {
  it("reports entity invalidation for structural changes and stops after unsubscribe", () => {
    const world = new UserWorld(new World("scene"));
    const entityChanged = vi.fn<NonNullable<WorldMutationObserver["entityChanged"]>>();
    const unsubscribe = world.observeMutations({ entityChanged });
    const entityId = world.create();
    const sprite = new Sprite("test", 16, 16);

    world.add(entityId, sprite);
    expect(entityChanged).toHaveBeenCalledOnce();
    expect(entityChanged).toHaveBeenLastCalledWith(world, entityId);

    world.remove(entityId, Sprite);
    expect(entityChanged).toHaveBeenCalledTimes(2);
    expect(entityChanged).toHaveBeenLastCalledWith(world, entityId);

    unsubscribe();
    world.add(entityId, sprite);
    expect(entityChanged).toHaveBeenCalledTimes(2);
  });

  it("reports direct sprite fields and explicitly published derived changes", () => {
    const world = new UserWorld(new World("scene"));
    const entityChanged = vi.fn<NonNullable<WorldMutationObserver["entityChanged"]>>();
    world.observeMutations({ entityChanged });
    const entityId = world.create();
    const sprite = new Sprite("test", 16, 16);
    const transform = new Transform2D();
    world.add(entityId, sprite);
    world.add(entityId, transform);
    entityChanged.mockClear();

    sprite.width = 32;
    transform.curr.pos.x = 4;
    transform.prev.rotation = Math.PI;
    world.notifyEntityChanged(entityId);
    expect(entityChanged.mock.calls).toEqual([
      [world, entityId],
      [world, entityId],
    ]);

    sprite.width = 32;
    expect(entityChanged).toHaveBeenCalledTimes(2);
  });

  it("reports one entity invalidation after all components are destroyed", () => {
    const world = new UserWorld(new World("scene"));
    const changedEntityIds: EntityId[] = [];
    world.observeMutations({
      entityChanged: (_, entityId) => {
        changedEntityIds.push(entityId);
      },
    });
    const entityId = world.create();
    const sprite = new Sprite("test", 16, 16);
    const transform = new Transform2D();
    world.add(entityId, sprite);
    world.add(entityId, transform);
    changedEntityIds.length = 0;

    world.destroy(entityId);

    expect(changedEntityIds).toEqual([entityId]);
    expect(world.all()).not.toContain(entityId);
  });

  it("reports one invalidation when a component is replaced", () => {
    const world = new UserWorld(new World("scene"));
    const entityChanged = vi.fn<NonNullable<WorldMutationObserver["entityChanged"]>>();
    world.observeMutations({ entityChanged });
    const entityId = world.create();
    world.add(entityId, new Sprite("first", 16, 16));
    entityChanged.mockClear();

    const replacement = new Sprite("second", 32, 32);
    world.add(entityId, Sprite, replacement);

    expect(entityChanged).toHaveBeenCalledOnce();
    expect(entityChanged).toHaveBeenCalledWith(world, entityId);
    expect(world.get(entityId, Sprite)).toBe(replacement);
  });
});
