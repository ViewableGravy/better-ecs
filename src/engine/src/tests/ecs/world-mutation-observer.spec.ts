import { Sprite, Transform2D } from "@engine/components";
import type { EntityId } from "@engine/ecs/entity";
import { UserWorld, World, type WorldMutationObserver } from "@engine/ecs/world";
import { describe, expect, it, vi } from "vitest";

describe("UserWorld mutation observers", () => {
  it("reports component lifecycle changes and stops after unsubscribe", () => {
    const world = new UserWorld(new World("scene"));
    const componentAdded = vi.fn<NonNullable<WorldMutationObserver["componentAdded"]>>();
    const componentRemoved = vi.fn<NonNullable<WorldMutationObserver["componentRemoved"]>>();
    const unsubscribe = world.observeMutations({ componentAdded, componentRemoved });
    const entityId = world.create();
    const sprite = new Sprite("test", 16, 16);

    world.add(entityId, sprite);
    expect(componentAdded).toHaveBeenCalledOnce();
    expect(componentAdded).toHaveBeenLastCalledWith(world, entityId, sprite);

    world.remove(entityId, Sprite);
    expect(componentRemoved).toHaveBeenCalledOnce();
    expect(componentRemoved).toHaveBeenLastCalledWith(world, entityId, sprite);

    unsubscribe();
    world.add(entityId, sprite);
    expect(componentAdded).toHaveBeenCalledOnce();
  });

  it("reports direct sprite fields and explicitly published derived transform changes", () => {
    const world = new UserWorld(new World("scene"));
    const componentChanged = vi.fn<NonNullable<WorldMutationObserver["componentChanged"]>>();
    world.observeMutations({ componentChanged });
    const entityId = world.create();
    const sprite = new Sprite("test", 16, 16);
    const transform = new Transform2D();
    world.add(entityId, sprite);
    world.add(entityId, transform);

    sprite.width = 32;
    transform.curr.pos.x = 4;
    transform.prev.rotation = Math.PI;
    world.notifyComponentChanged(entityId, transform);
    expect(componentChanged.mock.calls).toEqual([
      [world, entityId, sprite],
      [world, entityId, transform],
    ]);

    sprite.width = 32;
    expect(componentChanged).toHaveBeenCalledTimes(2);
  });

  it("reports removals for every component destroyed with an entity", () => {
    const world = new UserWorld(new World("scene"));
    const removed: Array<[EntityId, unknown]> = [];
    world.observeMutations({
      componentRemoved: (_, entityId, component) => {
        removed.push([entityId, component]);
      },
    });
    const entityId = world.create();
    const sprite = new Sprite("test", 16, 16);
    const transform = new Transform2D();
    world.add(entityId, sprite);
    world.add(entityId, transform);

    world.destroy(entityId);

    expect(removed).toEqual([
      [entityId, sprite],
      [entityId, transform],
    ]);
  });
});
