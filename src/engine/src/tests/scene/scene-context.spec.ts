import { SceneContext } from "@engine/core";
import { Registry } from "@engine/ecs/registry";
import { describe, expect, it } from "vitest";

describe("SceneContext", () => {
  it("owns exactly one registry", () => {
    const registry = new Registry();
    const scene = new SceneContext("scene", registry);
    const entityId = scene.registry.create();

    expect(scene.name).toBe("scene");
    expect(scene.registry).toBe(registry);
    expect(scene.registry.all()).toEqual([entityId]);
  });

  it("clears its registry", () => {
    const scene = new SceneContext("scene");
    scene.registry.create();

    scene.clear();

    expect(scene.registry.all()).toEqual([]);
  });
});
