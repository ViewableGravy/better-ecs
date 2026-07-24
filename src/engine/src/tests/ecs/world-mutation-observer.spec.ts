import { Parent, Sprite, Transform2D } from "@engine/components";
import type { EntityId } from "@engine/ecs/entity";
import {
  Registry,
  type ComponentMutationKind,
  type RegistryMutationObserver,
} from "@engine/ecs/registry";
import { describe, expect, it, vi } from "vitest";

describe("Registry mutation observers", () => {
  it("reports entity invalidation for structural changes and stops after unsubscribe", () => {
    const world = new Registry();
    const entityChanged = vi.fn<NonNullable<RegistryMutationObserver["entityChanged"]>>();
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

  it("publishes one component-aware event for patch while direct writes remain untracked", () => {
    const world = new Registry();
    const entityChanged = vi.fn<NonNullable<RegistryMutationObserver["entityChanged"]>>();
    const componentChanged = vi.fn<NonNullable<RegistryMutationObserver["componentChanged"]>>();
    world.observeMutations({ entityChanged, componentChanged });
    const entityId = world.create();
    const sprite = new Sprite("test", 16, 16);
    const transform = new Transform2D();
    world.add(entityId, sprite);
    world.add(entityId, transform);
    entityChanged.mockClear();
    componentChanged.mockClear();

    sprite.width = 32;
    transform.curr.pos.x = 4;
    transform.prev.rotation = Math.PI;
    expect(entityChanged).not.toHaveBeenCalled();
    expect(componentChanged).not.toHaveBeenCalled();

    expect(world.patch(entityId, Sprite, (patchedSprite) => {
      patchedSprite.width = 64;
      patchedSprite.height = 48;
    })).toBe(sprite);

    expect(entityChanged).not.toHaveBeenCalled();
    expect(componentChanged).toHaveBeenCalledOnce();
    expect(componentChanged).toHaveBeenCalledWith(world, entityId, Sprite, "patched", sprite);
  });

  it("publishes a patch after a callback throws because the component may be partially changed", () => {
    const world = new Registry();
    const entityChanged = vi.fn<NonNullable<RegistryMutationObserver["entityChanged"]>>();
    const componentChanged = vi.fn<NonNullable<RegistryMutationObserver["componentChanged"]>>();
    world.observeMutations({ entityChanged, componentChanged });
    const entityId = world.create();
    world.add(entityId, new Sprite("test", 16, 16));
    entityChanged.mockClear();
    componentChanged.mockClear();

    expect(() => world.patch(entityId, Sprite, (sprite) => {
      sprite.width = 64;
      throw new Error("mutation failed");
    })).toThrow("mutation failed");

    expect(world.require(entityId, Sprite).width).toBe(64);
    expect(entityChanged).not.toHaveBeenCalled();
    expect(componentChanged).toHaveBeenCalledWith(
      world,
      entityId,
      Sprite,
      "patched",
      world.require(entityId, Sprite),
    );
  });

  it("tryPatch mutates when present and does nothing when absent", () => {
    const world = new Registry();
    const componentChanged = vi.fn<NonNullable<RegistryMutationObserver["componentChanged"]>>();
    world.observeMutations({ componentChanged });
    const entityId = world.create();
    const callback = vi.fn<(sprite: Sprite) => void>((sprite) => {
      sprite.width = 24;
    });

    expect(world.tryPatch(entityId, Sprite, callback)).toBeUndefined();
    expect(callback).not.toHaveBeenCalled();
    expect(componentChanged).not.toHaveBeenCalled();

    const sprite = new Sprite("test", 16, 16);
    world.add(entityId, sprite);
    componentChanged.mockClear();

    expect(world.tryPatch(entityId, Sprite, callback)).toBe(sprite);
    expect(callback).toHaveBeenCalledOnce();
    expect(componentChanged).toHaveBeenCalledWith(world, entityId, Sprite, "patched", sprite);
  });

  it("patch requires the component to exist without invoking the callback or publishing", () => {
    const world = new Registry();
    const componentChanged = vi.fn<NonNullable<RegistryMutationObserver["componentChanged"]>>();
    world.observeMutations({ componentChanged });
    const entityId = world.create();
    const callback = vi.fn<(sprite: Sprite) => void>();

    expect(() => world.patch(entityId, Sprite, callback)).toThrow(
      `Component Sprite does not exist on entity ${entityId}`,
    );
    expect(callback).not.toHaveBeenCalled();
    expect(componentChanged).not.toHaveBeenCalled();
  });

  it("reports component type and mutation kind for add, replace, patch, and remove", () => {
    const world = new Registry();
    const changes: Array<[Function, ComponentMutationKind]> = [];
    world.observeMutations({
      componentChanged: (_, __, componentType, kind) => {
        changes.push([componentType, kind]);
      },
    });
    const entityId = world.create();

    world.add(entityId, new Sprite("first", 16, 16));
    world.add(entityId, Sprite, new Sprite("second", 32, 32));
    world.patch(entityId, Sprite, (sprite) => {
      sprite.width = 48;
    });
    world.remove(entityId, Sprite);

    expect(changes).toEqual([
      [Sprite, "added"],
      [Sprite, "patched"],
      [Sprite, "patched"],
      [Sprite, "removed"],
    ]);
  });

  it("rejects Parent patching in favor of hierarchy operations", () => {
    const world = new Registry();
    const parentEntityId = world.create();
    const childEntityId = world.create();
    world.setParent(childEntityId, parentEntityId);

    expect(() => world.patch(childEntityId, Parent, () => undefined)).toThrow(
      "Parent cannot be patched directly",
    );
  });

  it("reports component removals before the final destroyed-entity invalidation", () => {
    const world = new Registry();
    const changedEntityIds: EntityId[] = [];
    const removedComponentTypes: Function[] = [];
    world.observeMutations({
      entityChanged: (_, entityId) => {
        changedEntityIds.push(entityId);
      },
      componentChanged: (_, __, componentType, kind) => {
        if (kind === "removed") {
          removedComponentTypes.push(componentType);
        }
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
    expect(removedComponentTypes).toEqual([Sprite, Transform2D]);
    expect(world.all()).not.toContain(entityId);
  });

  it("reports one invalidation when a component is replaced", () => {
    const world = new Registry();
    const entityChanged = vi.fn<NonNullable<RegistryMutationObserver["entityChanged"]>>();
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
