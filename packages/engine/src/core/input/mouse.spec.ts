import { describe, expect, it } from "vitest";

import { Parent, Transform2D } from "@components";
import { UserWorld, World } from "@ecs/world";
import { getEntityAtWorldPoint } from "@core/input/mouse";

describe("getEntityAtWorldPoint", () => {
  it("prefers parent by default when child and parent are both selectable", () => {
    const world = new UserWorld(new World("scene"));

    const parent = world.create();
    const child = world.create();

    world.add(parent, new Transform2D(0, 0));
    world.add(child, new Transform2D(0, 0));
    world.add(child, new Parent(parent));

    const picked = getEntityAtWorldPoint(world, { x: 0, y: 0 }, 1);
    expect(picked).toBe(parent);
  });

  it("returns most nested entity when preferParent is false", () => {
    const world = new UserWorld(new World("scene"));

    const parent = world.create();
    const child = world.create();

    world.add(parent, new Transform2D(0, 0));
    world.add(child, new Transform2D(0, 0));
    world.add(child, new Parent(parent));

    const picked = getEntityAtWorldPoint(world, { x: 0, y: 0 }, 1, { preferParent: false });
    expect(picked).toBe(child);
  });

  it("does not promote to parent when parent would not be selected", () => {
    const world = new UserWorld(new World("scene"));

    const parent = world.create();
    const child = world.create();

    world.add(parent, new Transform2D(2, 0));
    world.add(child, new Transform2D(-2, 0));
    world.add(child, new Parent(parent));

    const picked = getEntityAtWorldPoint(world, { x: 0, y: 0 }, 3);
    expect(picked).toBe(child);
  });

  it("promotes through multiple ancestors when all are equally selectable", () => {
    const world = new UserWorld(new World("scene"));

    const root = world.create();
    const parent = world.create();
    const child = world.create();

    world.add(root, new Transform2D(0, 0));
    world.add(parent, new Transform2D(0, 0));
    world.add(child, new Transform2D(0, 0));
    world.add(parent, new Parent(root));
    world.add(child, new Parent(parent));

    const picked = getEntityAtWorldPoint(world, { x: 0, y: 0 }, 1);
    expect(picked).toBe(root);
  });
});
