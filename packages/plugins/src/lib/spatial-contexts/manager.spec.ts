import { describe, expect, it } from "vitest";

import { SceneContext, World } from "@repo/engine";

import { contextId } from "./context-id";
import { defineContext } from "./definition";
import { installSpatialContexts } from "./install";

describe("spatial-contexts/SpatialContextManager", () => {
  it("runs root setup even though default world already exists", async () => {
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
      focusedContextId: ROOT,
    });

    await manager.ensureWorldLoaded(ROOT);
    await manager.ensureWorldLoaded(ROOT);

    expect(ran).toBe(1);
  });

  it("prevents unloading the focused context", async () => {
    const internal = new World("scene");
    const scene = new SceneContext("scene", internal);

    const ROOT = contextId("default");
    const HOUSE = contextId("house");

    const manager = installSpatialContexts(scene, {
      definitions: [defineContext({ id: ROOT }), defineContext({ id: HOUSE, parentId: ROOT })],
      focusedContextId: HOUSE,
    });

    await manager.ensureWorldLoaded(HOUSE);
    await manager.setFocusedContextId(HOUSE);

    expect(() => manager.unloadWorld(HOUSE)).toThrow(/focused/i);
  });

  it("computes visible worlds in parent->focused render order", async () => {
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
      focusedContextId: HOUSE,
    });

    await manager.ensureWorldLoaded(HOUSE);
    await manager.setFocusedContextId(HOUSE);

    expect(manager.getVisibleContextIds()).toEqual([ROOT, HOUSE]);
  });
});
