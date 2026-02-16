import { describe, expect, it } from "vitest";

import { SceneContext, World } from "@repo/engine";

import { contextId } from "./context-id";
import { defineContext } from "./definition";
import { installSpatialContexts } from "./install";

describe("spatial-contexts/SpatialContextManager", () => {
  it("runs root setup even though default world already exists", () => {
    const internal = new World("scene");
    const scene = new SceneContext("scene", internal);

    const ROOT = contextId("default");

    let ran = 0;

    const manager = installSpatialContexts(scene, {
      definitions: [
        defineContext({
          id: ROOT,
          setup() {
            ran++;
          },
        }),
      ],
    });

    manager.ensureWorldLoaded(ROOT);
    manager.ensureWorldLoaded(ROOT);

    expect(ran).toBe(1);
  });

  it("prevents unloading the focused context", () => {
    const internal = new World("scene");
    const scene = new SceneContext("scene", internal);

    const ROOT = contextId("default");
    const HOUSE = contextId("house");

    const manager = installSpatialContexts(scene, {
      definitions: [defineContext({ id: ROOT }), defineContext({ id: HOUSE, parentId: ROOT })],
    });

    manager.ensureWorldLoaded(HOUSE);
    manager.setFocusedContextId(HOUSE);

    expect(() => manager.unloadWorld(HOUSE)).toThrow(/focused/i);
  });

  it("computes visible worlds in parent->focused render order", () => {
    const internal = new World("scene");
    const scene = new SceneContext("scene", internal);

    const ROOT = contextId("default");
    const HOUSE = contextId("house");

    const manager = installSpatialContexts(scene, {
      definitions: [
        defineContext({
          id: ROOT,
          policy: { visibility: "stack", simulation: "focused-only" },
        }),
        defineContext({
          id: HOUSE,
          parentId: ROOT,
          policy: { visibility: "stack", simulation: "focused-only" },
        }),
      ],
    });

    manager.ensureWorldLoaded(HOUSE);
    manager.setFocusedContextId(HOUSE);

    expect(manager.getVisibleContextIds()).toEqual([ROOT, HOUSE]);
  });

  it("returns focused world via manager accessor", () => {
    const internal = new World("scene");
    const scene = new SceneContext("scene", internal);

    const ROOT = contextId("default");
    const HOUSE = contextId("house");

    const manager = installSpatialContexts(scene, {
      definitions: [defineContext({ id: ROOT }), defineContext({ id: HOUSE, parentId: ROOT })],
    });

    manager.ensureWorldLoaded(HOUSE);
    manager.setFocusedContextId(HOUSE);

    expect(manager.getFocusedWorld()).toBe(manager.getWorldOrThrow(HOUSE));
  });

  it("resolves context relationships relative to focused/player world", () => {
    const internal = new World("scene");
    const scene = new SceneContext("scene", internal);

    const ROOT = contextId("default");
    const HOUSE = contextId("house");
    const BASEMENT = contextId("basement");
    const DUNGEON = contextId("dungeon");

    const manager = installSpatialContexts(scene, {
      definitions: [
        defineContext({ id: ROOT }),
        defineContext({ id: HOUSE, parentId: ROOT }),
        defineContext({ id: BASEMENT, parentId: HOUSE }),
        defineContext({ id: DUNGEON, parentId: ROOT }),
      ],
    });

    expect(manager.getContextRelationship(HOUSE, HOUSE)).toBe("self");
    expect(manager.getContextRelationship(HOUSE, ROOT)).toBe("ancestor");
    expect(manager.getContextRelationship(HOUSE, BASEMENT)).toBe("descendant");
    expect(manager.getContextRelationship(HOUSE, DUNGEON)).toBe("unrelated");
  });
});
