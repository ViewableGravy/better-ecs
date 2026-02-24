import { describe, expect, it } from "vitest";

import { SceneContext } from "../../core";
import { World } from "../../ecs/world";

class TestComponent {
  constructor(public value: string) {}
}

describe("SceneContext", () => {
  it("should expose a default world", () => {
    const internal = new World("scene");
    const scene = new SceneContext("scene", internal);

    expect(scene.name).toBe("scene");
    expect(scene.defaultWorldId).toBe("default");

    const world = scene.getDefaultWorld();
    const id = world.create();
    expect(world.all()).toEqual([id]);
  });

  it("should register and unregister additional worlds", () => {
    const scene = new SceneContext("scene", new World("scene"));

    expect(scene.hasWorld("overworld")).toBe(false);

    const overworld = scene.loadAdditionalWorld("overworld");
    overworld.create();

    expect(scene.hasWorld("overworld")).toBe(true);
    expect(scene.getWorld("overworld")?.all().length).toBe(1);

    scene.unloadWorld("overworld");
    expect(scene.hasWorld("overworld")).toBe(false);
    expect(scene.getWorld("overworld")).toBeUndefined();
  });

  it("should not allow unregistering the default world", () => {
    const scene = new SceneContext("scene", new World("scene"));

    expect(() => scene.unloadWorld("default")).toThrow("Cannot unregister default world");
  });

  it("should clear all worlds and drop non-default worlds", () => {
    const scene = new SceneContext("scene", new World("scene"));

    scene.getDefaultWorld().create();
    scene.loadAdditionalWorld("a").create();
    scene.loadAdditionalWorld("b").create();

    scene.clearAllWorlds();

    expect(scene.getDefaultWorld().all().length).toBe(0);
    expect(scene.hasWorld("a")).toBe(false);
    expect(scene.hasWorld("b")).toBe(false);
  });

  it("should move an entity between worlds without duplication", () => {
    const scene = new SceneContext("scene", new World("scene"));
    const house = scene.loadAdditionalWorld("house");
    const overworld = scene.loadAdditionalWorld("overworld");

    const player = house.create();
    house.add(player, TestComponent, new TestComponent("player"));

    house.move(player, overworld);

    expect(house.all()).toEqual([]);
    expect(overworld.all()).toEqual([player]);
    expect(overworld.get(player, TestComponent)?.value).toBe("player");

    overworld.move(player, house);

    expect(overworld.all()).toEqual([]);
    expect(house.all()).toEqual([player]);
    expect(house.get(player, TestComponent)?.value).toBe("player");
  });
});
