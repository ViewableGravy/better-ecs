import { describe, expect, it } from "vitest";

import { Parent, Transform2D, WorldTransform2D } from "@engine/components";
import { getWorldTransform2D } from "@engine/ecs/hierarchy";
import { UserWorld, World } from "@engine/ecs/world";
import { syncWorldTransform2D, syncWorldTransform2DSubtree } from "@engine/systems/worldTransform2D";

describe("worldTransform2D", () => {
  it("caches composed world transforms across a hierarchy", () => {
    const world = new UserWorld(new World("scene"));

    const root = world.create();
    const child = world.create();

    world.add(root, new Transform2D(10, 20));
    world.add(child, new Transform2D(2, 3));
    world.add(child, new Parent(root));

    syncWorldTransform2D(world);

    const childWorldTransform = getWorldTransform2D(world, child);
    expect(childWorldTransform).toBeInstanceOf(WorldTransform2D);
    expect(childWorldTransform?.curr.pos.x).toBe(12);
    expect(childWorldTransform?.curr.pos.y).toBe(23);
  });

  it("updates descendants when a local transform changes outside scene systems", () => {
    const world = new UserWorld(new World("scene"));

    const root = world.create();
    const child = world.create();

    world.add(root, new Transform2D(10, 20));
    world.add(child, new Transform2D(2, 3));
    world.add(child, new Parent(root));

    syncWorldTransform2D(world);

    const rootTransform = world.require(root, Transform2D);
    rootTransform.curr.pos.set(30, 40);
    rootTransform.prev.pos.set(30, 40);

    syncWorldTransform2DSubtree(world, root);

    const childWorldTransform = getWorldTransform2D(world, child);
    expect(childWorldTransform?.curr.pos.x).toBe(32);
    expect(childWorldTransform?.curr.pos.y).toBe(43);
  });

  it("removes stale cached transforms when local transforms are removed", () => {
    const world = new UserWorld(new World("scene"));

    const entityId = world.create();
    world.add(entityId, new Transform2D(1, 2));

    syncWorldTransform2D(world);
    expect(getWorldTransform2D(world, entityId)).toBeDefined();

    world.remove(entityId, Transform2D);
    syncWorldTransform2D(world);

    expect(getWorldTransform2D(world, entityId)).toBeUndefined();
  });
});