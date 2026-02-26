import { describe, expect, it, vi } from "vitest";

import { Parent } from "../../components";
import { UserWorld, World } from "../../ecs/world";

class Marker {}

describe("World subscriptions", () => {
  it("should notify world subscribers for entity lifecycle changes", () => {
    const world = new UserWorld(new World("scene"));
    const listener = vi.fn();
    const unsubscribe = world.subscribe(listener);

    const entityId = world.create();
    world.add(entityId, Marker, new Marker());
    world.remove(entityId, Marker);
    world.destroy(entityId);

    expect(listener).toHaveBeenCalledTimes(4);

    unsubscribe();
    world.create();
    expect(listener).toHaveBeenCalledTimes(4);
  });

  it("should notify entity subscribers for parent-child structure changes", () => {
    const world = new UserWorld(new World("scene"));
    const parentId = world.create();
    const childId = world.create();

    const parentListener = vi.fn();
    const childListener = vi.fn();

    world.subscribeEntity(parentId, parentListener);
    world.subscribeEntity(childId, childListener);

    world.add(childId, Parent, new Parent(parentId));
    expect(parentListener).toHaveBeenCalledTimes(1);
    expect(childListener).toHaveBeenCalledTimes(1);

    world.destroy(childId);
    expect(parentListener).toHaveBeenCalledTimes(2);
    expect(childListener).toHaveBeenCalledTimes(2);
  });
});
