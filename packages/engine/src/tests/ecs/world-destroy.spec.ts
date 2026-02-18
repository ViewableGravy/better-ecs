import { describe, expect, it } from "vitest";

import { Parent } from "../../components";
import { UserWorld, World } from "../../ecs/world";

class Marker {
  constructor(public value: string) {}
}

describe("World destroy hierarchy", () => {
  it("should destroy all descendants when destroying a parent entity", () => {
    const world = new UserWorld(new World("scene"));

    const root = world.create();
    const child = world.create();
    const grandchild = world.create();
    const sibling = world.create();

    world.add(root, new Marker("root"));
    world.add(child, new Parent(root));
    world.add(child, new Marker("child"));
    world.add(grandchild, new Parent(child));
    world.add(grandchild, new Marker("grandchild"));
    world.add(sibling, new Marker("sibling"));

    world.destroy(root);

    const remaining = world.all();
    expect(remaining).toEqual([sibling]);
    expect(world.get(root, Marker)).toBeUndefined();
    expect(world.get(child, Marker)).toBeUndefined();
    expect(world.get(grandchild, Marker)).toBeUndefined();
    expect(world.get(sibling, Marker)?.value).toBe("sibling");
  });
});
