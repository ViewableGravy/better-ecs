import { Parent } from "@engine/components";
import { Registry, type RegistryMutationObserver } from "@engine/ecs/registry";
import { describe, expect, it, vi } from "vitest";

describe("Registry hierarchy", () => {
  it("attaches, reparents, and removes Parent while keeping cached children coherent", () => {
    const world = new Registry();
    const componentChanged = vi.fn<NonNullable<RegistryMutationObserver["componentChanged"]>>();
    world.observeMutations({ componentChanged });
    const firstParent = world.create();
    const secondParent = world.create();
    const child = world.create();

    world.setParent(child, firstParent);
    const parent = world.require(child, Parent);
    expect(parent.entityId).toBe(firstParent);
    expect(world.getChildren(firstParent)).toEqual(new Set([child]));
    expect(componentChanged).toHaveBeenLastCalledWith(world, child, Parent, "added", parent);

    world.setParent(child, secondParent);
    expect(world.require(child, Parent).entityId).toBe(secondParent);
    expect(world.getChildren(firstParent)).toBeUndefined();
    expect(world.getChildren(secondParent)).toEqual(new Set([child]));
    expect(componentChanged).toHaveBeenLastCalledWith(world, child, Parent, "patched", parent);

    world.removeParent(child);
    expect(world.get(child, Parent)).toBeUndefined();
    expect(world.getChildren(secondParent)).toBeUndefined();
    expect(componentChanged).toHaveBeenLastCalledWith(world, child, Parent, "removed", parent);
  });

  it("treats setting the existing parent and removing no parent as no-ops", () => {
    const world = new Registry();
    const parent = world.create();
    const child = world.create();
    const componentChanged = vi.fn<NonNullable<RegistryMutationObserver["componentChanged"]>>();
    world.observeMutations({ componentChanged });

    world.setParent(child, parent);
    componentChanged.mockClear();
    world.setParent(child, parent);
    expect(componentChanged).not.toHaveBeenCalled();

    world.removeParent(child);
    componentChanged.mockClear();
    world.removeParent(child);
    expect(componentChanged).not.toHaveBeenCalled();
  });

  it("rejects self-parenting, missing entities, and indirect cycles without changing adjacency", () => {
    const world = new Registry();
    const root = world.create();
    const child = world.create();
    const grandchild = world.create();
    const missing = world.create();
    world.destroy(missing);
    world.setParent(child, root);
    world.setParent(grandchild, child);

    expect(() => world.setParent(root, root)).toThrow("cannot be its own parent");
    expect(() => world.setParent(root, grandchild)).toThrow("would create a cycle");
    expect(() => world.setParent(child, missing)).toThrow("does not exist");

    expect(world.get(root, Parent)).toBeUndefined();
    expect(world.getChildren(root)).toEqual(new Set([child]));
    expect(world.getChildren(child)).toEqual(new Set([grandchild]));
  });

  it("cleans adjacency when a child is destroyed and recursively destroys cached descendants", () => {
    const world = new Registry();
    const root = world.create();
    const child = world.create();
    const grandchild = world.create();
    world.setParent(child, root);
    world.setParent(grandchild, child);

    world.destroy(child);

    expect(world.all()).toEqual([root]);
    expect(world.getChildren(root)).toBeUndefined();
    expect(world.getChildren(child)).toBeUndefined();
  });

});
