import { describe, expect, it } from "vitest";

import { Parent, Transform2D } from "../../components";
import { UserWorld, World } from "../../ecs/world";
import { EngineEditorSelectionManager } from "./selection-manager";

describe("EngineEditorSelectionManager", () => {
  it("prefers parent by default when parent and child overlap", () => {
    const world = new UserWorld(new World("scene"));

    const parent = world.create();
    const child = world.create();

    world.add(parent, new Transform2D(0, 0));
    world.add(child, new Transform2D(0, 0));
    world.add(child, new Parent(parent));

    const manager = new EngineEditorSelectionManager({
      getWorld: () => world,
    });

    const picked = manager.entityAtPoint(0, 0, 1);
    expect(picked).toBe(parent);
  });

  it("returns most nested entity when preferParent is false", () => {
    const world = new UserWorld(new World("scene"));

    const parent = world.create();
    const child = world.create();

    world.add(parent, new Transform2D(0, 0));
    world.add(child, new Transform2D(0, 0));
    world.add(child, new Parent(parent));

    const manager = new EngineEditorSelectionManager({
      getWorld: () => world,
    });

    const picked = manager.entityAtPoint(0, 0, 1, { preferParent: false });
    expect(picked).toBe(child);
  });

  it("keeps child selected when parent is farther than nearest pick", () => {
    const world = new UserWorld(new World("scene"));

    const parent = world.create();
    const child = world.create();

    world.add(parent, new Transform2D(2, 0));
    world.add(child, new Transform2D(-2, 0));
    world.add(child, new Parent(parent));

    const manager = new EngineEditorSelectionManager({
      getWorld: () => world,
    });

    const picked = manager.entityAtPoint(0, 0, 3);
    expect(picked).toBe(child);
  });
});
