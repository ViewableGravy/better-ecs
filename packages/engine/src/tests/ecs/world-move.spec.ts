import { describe, expect, it } from "vitest";

import { Parent } from "../../components";
import { UserWorld, World } from "../../ecs/world";

class Marker {
  constructor(public value: string) {}
}

describe("World move hierarchy", () => {
  it("should move a parent entity and all descendants to target world", () => {
    const source = new UserWorld(new World("source"));
    const target = new UserWorld(new World("target"));

    const root = source.create();
    const child = source.create();
    const grandchild = source.create();
    const sibling = source.create();

    source.add(root, new Marker("root"));
    source.add(child, new Parent(root));
    source.add(child, new Marker("child"));
    source.add(grandchild, new Parent(child));
    source.add(grandchild, new Marker("grandchild"));
    source.add(sibling, new Marker("sibling"));

    source.move(root, target);

    expect(source.all()).toEqual([sibling]);
    expect(target.all()).toEqual([root, child, grandchild]);

    expect(target.get(root, Marker)?.value).toBe("root");
    expect(target.get(child, Marker)?.value).toBe("child");
    expect(target.get(grandchild, Marker)?.value).toBe("grandchild");

    expect(target.get(child, Parent)?.entityId).toBe(root);
    expect(target.get(grandchild, Parent)?.entityId).toBe(child);
  });

  it("should create truthy entity ids", () => {
    const world = new UserWorld(new World("scene"));

    const entityId = world.create();

    expect(entityId).toBeGreaterThan(0);
    expect(Boolean(entityId)).toBe(true);
  });
});
