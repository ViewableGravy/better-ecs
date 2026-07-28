import { describe, expect, it, vi } from "vitest";

import { Transform2D, WorldTransform2D } from "@engine/components";
import { createEngine } from "@engine/core";
import { executeWithContext } from "@engine/core/context";
import { getWorldTransform2D } from "@engine/ecs/hierarchy";
import type { EntityId } from "@engine/ecs/entity";
import { Registry, type RegistryMutationObserver } from "@engine/ecs/registry";
import { transform2DTracker } from "@engine/systems/transform2d-tracker";
import {
  syncWorldTransform2D,
  syncWorldTransform2DSubtree,
  worldTransform2DSystem,
} from "@engine/systems/worldTransform2D";

describe("worldTransform2D", () => {
  it("caches composed world transforms across a hierarchy", () => {
    const world = new Registry();

    const root = world.create();
    const child = world.create();

    world.add(root, new Transform2D(10, 20));
    world.add(child, new Transform2D(2, 3));
    world.setParent(child, root);

    syncWorldTransform2D(world);

    const childWorldTransform = getWorldTransform2D(world, child);
    expect(childWorldTransform).toBeInstanceOf(WorldTransform2D);
    expect(childWorldTransform?.curr.pos.x).toBe(12);
    expect(childWorldTransform?.curr.pos.y).toBe(23);
  });

  it("immediately synchronizes an explicitly patched subtree outside scene systems", () => {
    const world = new Registry();

    const root = world.create();
    const child = world.create();

    world.add(root, new Transform2D(10, 20));
    world.add(child, new Transform2D(2, 3));
    world.setParent(child, root);

    syncWorldTransform2D(world);

    world.patch(root, Transform2D, (transform) => {
      transform.curr.pos.set(30, 40);
      transform.prev.pos.set(30, 40);
    });

    syncWorldTransform2DSubtree(world, root);

    const childWorldTransform = getWorldTransform2D(world, child);
    expect(childWorldTransform?.curr.pos.x).toBe(32);
    expect(childWorldTransform?.curr.pos.y).toBe(43);
  });

  it("recomputes patched ancestors before immediately synchronizing a child subtree", () => {
    const world = new Registry();
    const root = world.create();
    const child = world.create();

    world.add(root, new Transform2D(10, 20));
    world.add(child, new Transform2D(2, 3));
    world.setParent(child, root);
    syncWorldTransform2D(world);

    world.patch(root, Transform2D, (transform) => {
      transform.curr.pos.set(30, 40);
      transform.prev.pos.set(30, 40);
    });

    syncWorldTransform2DSubtree(world, child);

    expect(world.require(root, WorldTransform2D).curr.pos.x).toBe(30);
    expect(world.require(root, WorldTransform2D).curr.pos.y).toBe(40);
    expect(world.require(child, WorldTransform2D).curr.pos.x).toBe(32);
    expect(world.require(child, WorldTransform2D).curr.pos.y).toBe(43);
  });

  it("does not finalize an immediately synchronized dirty subtree twice", () => {
    const world = new Registry();
    const root = world.create();
    const child = world.create();

    world.add(root, new Transform2D(10, 20));
    world.add(child, new Transform2D(2, 3));
    world.setParent(child, root);
    syncWorldTransform2D(world);

    const publishedWorldTransformEntityIds: EntityId[] = [];
    world.observeMutations({
      componentChanged: (_, entityId, componentType, kind) => {
        if (componentType === WorldTransform2D && kind === "patched") {
          publishedWorldTransformEntityIds.push(entityId);
        }
      },
    });

    world.patch(root, Transform2D, (transform) => {
      transform.curr.pos.x = 30;
    });
    syncWorldTransform2DSubtree(world, root);
    expect(publishedWorldTransformEntityIds).toEqual([root, child]);

    publishedWorldTransformEntityIds.length = 0;
    syncWorldTransform2D(world);

    expect(publishedWorldTransformEntityIds).toEqual([]);
  });

  it("does not propagate a direct component write until it is patched", () => {
    const world = new Registry();
    const root = world.create();
    const child = world.create();

    world.add(root, new Transform2D(10, 20));
    world.add(child, new Transform2D(2, 3));
    world.setParent(child, root);
    syncWorldTransform2D(world);

    const rootTransform = world.require(root, Transform2D);
    rootTransform.curr.pos.set(30, 40);
    rootTransform.prev.pos.set(30, 40);
    syncWorldTransform2D(world);
    expect(world.require(child, WorldTransform2D).curr.pos.x).toBe(12);

    world.patch(root, Transform2D, () => undefined);
    syncWorldTransform2D(world);
    expect(world.require(child, WorldTransform2D).curr.pos.x).toBe(32);
    expect(world.require(child, WorldTransform2D).curr.pos.y).toBe(43);
  });

  it("settles cached interpolation history after movement stops", () => {
    const world = new Registry();

    const entityId = world.create();
    world.add(entityId, new Transform2D(0, 0));

    syncWorldTransform2D(world);

    transform2DTracker.snapshot(world);
    world.patch(entityId, Transform2D, (transform) => {
      transform.curr.pos.x = 10;
    });
    syncWorldTransform2D(world);

    const movingWorldTransform = world.require(entityId, WorldTransform2D);
    expect(movingWorldTransform.prev.pos.x).toBe(0);
    expect(movingWorldTransform.curr.pos.x).toBe(10);

    transform2DTracker.snapshot(world);
    syncWorldTransform2D(world);

    const settledWorldTransform = world.require(entityId, WorldTransform2D);
    expect(settledWorldTransform.prev.pos.x).toBe(10);
    expect(settledWorldTransform.curr.pos.x).toBe(10);
  });

  it("refreshes cached world transforms when direct updates keep curr and prev in sync", () => {
    const world = new Registry();

    const root = world.create();
    const child = world.create();

    world.add(root, new Transform2D(10, 20));
    world.add(child, new Transform2D(2, 3));
    world.setParent(child, root);

    syncWorldTransform2D(world);

    world.patch(root, Transform2D, (transform) => {
      transform.curr.pos.set(30, 40);
      transform.prev.pos.set(30, 40);
    });

    syncWorldTransform2D(world);

    const rootWorldTransform = world.require(root, WorldTransform2D);
    const childWorldTransform = world.require(child, WorldTransform2D);

    expect(rootWorldTransform.curr.pos.x).toBe(30);
    expect(rootWorldTransform.curr.pos.y).toBe(40);
    expect(rootWorldTransform.prev.pos.x).toBe(30);
    expect(rootWorldTransform.prev.pos.y).toBe(40);
    expect(childWorldTransform.curr.pos.x).toBe(32);
    expect(childWorldTransform.curr.pos.y).toBe(43);
    expect(childWorldTransform.prev.pos.x).toBe(32);
    expect(childWorldTransform.prev.pos.y).toBe(43);
  });

  it("removes stale cached transforms when local transforms are removed", () => {
    const world = new Registry();

    const entityId = world.create();
    world.add(entityId, new Transform2D(1, 2));

    syncWorldTransform2D(world);
    expect(getWorldTransform2D(world, entityId)).toBeDefined();

    world.remove(entityId, Transform2D);
    syncWorldTransform2D(world);

    expect(getWorldTransform2D(world, entityId)).toBeUndefined();
  });

  it("invalidates cached transforms through a descendant chain deeper than 64 entities", () => {
    const world = new Registry();
    const entityIds: EntityId[] = [];

    for (let index = 0; index < 70; index += 1) {
      const entityId = world.create();
      world.add(entityId, new Transform2D(index, 0));
      entityIds.push(entityId);
    }
    syncWorldTransform2D(world);

    for (let index = 1; index < entityIds.length; index += 1) {
      const entityId = entityIds[index];
      const parentEntityId = entityIds[index - 1];
      if (entityId === undefined || parentEntityId === undefined) {
        throw new Error("Expected the hierarchy fixture to contain every entity");
      }

      world.setParent(entityId, parentEntityId);
    }

    const rootEntityId = entityIds[0];
    if (rootEntityId === undefined) {
      throw new Error("Expected the hierarchy fixture to contain a root");
    }
    world.remove(rootEntityId, Transform2D);
    syncWorldTransform2D(world);

    for (const entityId of entityIds) {
      expect(world.get(entityId, WorldTransform2D)).toBeUndefined();
    }
  });

  it("publishes world-transform changes only for a sparse dirty subtree", () => {
    const world = new Registry();
    const root = world.create();
    const child = world.create();
    const grandchild = world.create();
    const unrelated = world.create();

    world.add(root, new Transform2D(10, 0));
    world.add(child, new Transform2D(2, 0));
    world.add(grandchild, new Transform2D(3, 0));
    world.add(unrelated, new Transform2D(100, 0));
    world.setParent(child, root);
    world.setParent(grandchild, child);
    syncWorldTransform2D(world);

    const publishedWorldTransformEntityIds: EntityId[] = [];
    world.observeMutations({
      componentChanged: (_, entityId, componentType, kind) => {
        if (componentType === WorldTransform2D && kind === "patched") {
          publishedWorldTransformEntityIds.push(entityId);
        }
      },
    });

    world.patch(child, Transform2D, (transform) => {
      transform.curr.pos.x = 20;
    });
    syncWorldTransform2D(world);

    expect(publishedWorldTransformEntityIds).toEqual([child, grandchild]);
    expect(world.require(root, WorldTransform2D).curr.pos.x).toBe(10);
    expect(world.require(child, WorldTransform2D).curr.pos.x).toBe(30);
    expect(world.require(grandchild, WorldTransform2D).curr.pos.x).toBe(33);
    expect(world.require(unrelated, WorldTransform2D).curr.pos.x).toBe(100);
  });

  it("does not publish transform work on a clean frame", () => {
    const world = new Registry();
    const entityId = world.create();
    world.add(entityId, new Transform2D(1, 2));
    syncWorldTransform2D(world);
    transform2DTracker.snapshot(world);

    const entityChanged = vi.fn<NonNullable<RegistryMutationObserver["entityChanged"]>>();
    const componentChanged = vi.fn<NonNullable<RegistryMutationObserver["componentChanged"]>>();
    world.observeMutations({ entityChanged, componentChanged });

    syncWorldTransform2D(world);
    transform2DTracker.snapshot(world);

    expect(entityChanged).not.toHaveBeenCalled();
    expect(componentChanged).not.toHaveBeenCalled();
  });

  it("recomputes a subtree after reparenting through the hierarchy API", () => {
    const world = new Registry();
    const firstRoot = world.create();
    const secondRoot = world.create();
    const child = world.create();
    const grandchild = world.create();

    world.add(firstRoot, new Transform2D(10, 0));
    world.add(secondRoot, new Transform2D(50, 0));
    world.add(child, new Transform2D(2, 0));
    world.add(grandchild, new Transform2D(3, 0));
    world.setParent(child, firstRoot);
    world.setParent(grandchild, child);
    syncWorldTransform2D(world);

    world.setParent(child, secondRoot);
    syncWorldTransform2D(world);

    expect(world.require(child, WorldTransform2D).curr.pos.x).toBe(52);
    expect(world.require(grandchild, WorldTransform2D).curr.pos.x).toBe(55);
    expect(world.getChildren(firstRoot)).toBeUndefined();
    expect([...world.getChildren(secondRoot) ?? []]).toEqual([child]);
  });

  it("invalidates and recreates a world transform after local transform removal and re-addition", () => {
    const world = new Registry();
    const entityId = world.create();
    world.add(entityId, new Transform2D(1, 2));
    syncWorldTransform2D(world);

    world.remove(entityId, Transform2D);
    syncWorldTransform2D(world);
    expect(world.get(entityId, WorldTransform2D)).toBeUndefined();

    world.add(entityId, new Transform2D(8, 9));
    syncWorldTransform2D(world);
    expect(world.require(entityId, WorldTransform2D).curr.pos.x).toBe(8);
    expect(world.require(entityId, WorldTransform2D).curr.pos.y).toBe(9);
  });

  it("removes cached transforms when destroying a hierarchy", () => {
    const world = new Registry();
    const root = world.create();
    const child = world.create();
    const grandchild = world.create();
    const sibling = world.create();

    world.add(root, new Transform2D());
    world.add(child, new Transform2D());
    world.add(grandchild, new Transform2D());
    world.add(sibling, new Transform2D(10, 0));
    world.setParent(child, root);
    world.setParent(grandchild, child);
    syncWorldTransform2D(world);

    world.destroy(root);
    syncWorldTransform2D(world);

    expect(world.all()).toEqual([sibling]);
    expect(world.get(root, WorldTransform2D)).toBeUndefined();
    expect(world.get(child, WorldTransform2D)).toBeUndefined();
    expect(world.get(grandchild, WorldTransform2D)).toBeUndefined();
    expect(world.get(sibling, WorldTransform2D)).toBeDefined();
  });

  it("finalizes the active scene Registry through the engine system", () => {
    const engine = createEngine({
      systems: [],
      scenes: [],
      manualRegisterEngine: true,
    });
    const registry = engine.scene.registry;
    const entityId = registry.create();
    registry.add(entityId, new Transform2D(4, 5));

    const system = worldTransform2DSystem();
    executeWithContext({ engine }, () => system.system());

    expect(registry.require(entityId, WorldTransform2D).curr.pos.x).toBe(4);
  });
});
