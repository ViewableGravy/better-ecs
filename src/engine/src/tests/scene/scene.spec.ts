// packages/engine/src/tests/scene/scene.spec.ts
/**
 * Runtime tests for scene management functionality.
 */

import { createEngine, createScene } from "@engine/core";
import { SCENE_BRAND } from "@engine/core/scene/scene.types";
import type { Registry } from "@engine/ecs/registry";
import { ActiveRegistry, fromContext } from "@engine/context";
import { describe, expect, it, vi } from "vitest";

describe("createScene", () => {
  it("should create a scene definition with correct name", () => {
    const scene = createScene("testScene")({
      setup: () => {
        /* setup */
      },
    });

    expect(scene.name).toBe("testScene");
    expect(scene[SCENE_BRAND]).toBe(true);
  });

  it("should have setup function", () => {
    const setupFn = vi.fn();
    const scene = createScene("testScene")({
      setup: setupFn,
    });

    expect(scene.setup).toBe(setupFn);
  });

  it("should have default teardown if not provided", () => {
    const scene = createScene("testScene")({
      setup: () => {
        /* setup */
      },
    });

    expect(scene.teardown).toBeDefined();
    expect(typeof scene.teardown).toBe("function");
  });

  it("should use custom teardown when provided", () => {
    const teardownFn = vi.fn();
    const scene = createScene("testScene")({
      setup: () => {
        /* setup */
      },
      teardown: teardownFn,
    });

    expect(scene.teardown).toBe(teardownFn);
  });
});

describe("EngineClass with scenes", () => {
  it("should register scenes correctly", () => {
    const MenuScene = createScene("menu")({
      setup: () => {
        /* setup */
      },
    });
    const GameScene = createScene("game")({
      setup: () => {
        /* setup */
      },
    });

    const engine = createEngine({
      systems: [],
      scenes: [MenuScene, GameScene],
    });

    expect(engine.scenes).toHaveProperty("menu");
    expect(engine.scenes).toHaveProperty("game");
  });

  it("should have a default active scene context initially", () => {
    const MenuScene = createScene("menu")({
      setup: () => {
        /* setup */
      },
    });

    const engine = createEngine({
      systems: [],
      scenes: [MenuScene],
    });

    expect(engine.scene.current).toBe("__default__");
  });

  it("should provide world access via engine.scene.registry", () => {
    const engine = createEngine({
      systems: [],
      scenes: [],
    });

    const world = engine.scene.registry;
    expect(world).toBeDefined();
    expect(typeof world.create).toBe("function");
  });

  it("should allow createEngine without user systems", () => {
    const engine = createEngine({
      scenes: [],
    });

    expect(engine.scene.registry).toBeDefined();
    expect(engine.systems).toHaveProperty("engine:input");
    expect(engine.systems).toHaveProperty("engine:transformSnapshot");
  });

  it("should expose scene manager via engine.scene", () => {
    const MenuScene = createScene("menu")({
      setup: () => {
        /* setup */
      },
    });

    const engine = createEngine({
      systems: [],
      scenes: [MenuScene],
    });

    expect(engine.scene).toBeDefined();
    expect(typeof engine.scene.set).toBe("function");
    expect(typeof engine.scene.has).toBe("function");
  });
});

describe("engine.scene.set", () => {
  it("should transition to a registered scene", async () => {
    const setupFn = vi.fn();
    const MenuScene = createScene("menu")({ setup: setupFn });

    const engine = createEngine({
      systems: [],
      scenes: [MenuScene],
    });

    await engine.scene.set("menu");

    expect(setupFn).toHaveBeenCalledTimes(1);
    expect(engine.scene.current).toBe("menu");
  });

  it("should provide the scene Registry through context during setup", async () => {
    let receivedRegistry: Registry | null = null;
    const MenuScene = createScene("menu")({
      setup() {
        receivedRegistry = fromContext(ActiveRegistry);
      },
    });

    const engine = createEngine({
      systems: [],
      scenes: [MenuScene],
    });

    await engine.scene.set("menu");

    expect(receivedRegistry).toBe(engine.registry);
  });

  it("should throw for unregistered scene", async () => {
    const engine = createEngine({
      systems: [],
      scenes: [],
    });

    await expect((engine.scene as any).set("nonexistent")).rejects.toThrow(
      'Scene "nonexistent" not found',
    );
  });

  it("should be idempotent when already on scene", async () => {
    const setupFn = vi.fn();
    const MenuScene = createScene("menu")({ setup: setupFn });

    const engine = createEngine({
      systems: [],
      scenes: [MenuScene],
    });

    await engine.scene.set("menu");
    await engine.scene.set("menu");

    expect(setupFn).toHaveBeenCalledTimes(1);
  });

  it("should call teardown when leaving a scene", async () => {
    const teardownFn = vi.fn();
    const MenuScene = createScene("menu")({
      setup: () => {
        /* setup */
      },
      teardown: teardownFn,
    });
    const GameScene = createScene("game")({
      setup: () => {
        /* setup */
      },
    });

    const engine = createEngine({
      systems: [],
      scenes: [MenuScene, GameScene],
    });

    await engine.scene.set("menu");
    await engine.scene.set("game");

    expect(teardownFn).toHaveBeenCalledTimes(1);
  });

  it("should clear entities when transitioning scenes", async () => {
    let entityCount = 0;

    const MenuScene = createScene("menu")({
      setup() {
        const world = fromContext(ActiveRegistry);
        world.create();
        world.create();
        world.create();
        entityCount = world.all().length;
      },
    });

    const GameScene = createScene("game")({
      setup() {
        const world = fromContext(ActiveRegistry);
        // New scene should start with no entities
        entityCount = world.all().length;
      },
    });

    const engine = createEngine({
      systems: [],
      scenes: [MenuScene, GameScene],
    });

    await engine.scene.set("menu");
    expect(entityCount).toBe(3);

    await engine.scene.set("game");
    expect(entityCount).toBe(0);
  });

  it("should support async setup", async () => {
    const order: string[] = [];

    const MenuScene = createScene("menu")({
      async setup() {
        order.push("setup-start");
        await new Promise((r) => setTimeout(r, 10));
        order.push("setup-end");
      },
    });

    const engine = createEngine({
      systems: [],
      scenes: [MenuScene],
    });

    await engine.scene.set("menu");

    expect(order).toEqual(["setup-start", "setup-end"]);
  });

  it("should support async teardown", async () => {
    const order: string[] = [];

    const MenuScene = createScene("menu")({
      setup() {
        order.push("menu-setup");
      },
      async teardown() {
        order.push("teardown-start");
        await new Promise((r) => setTimeout(r, 10));
        order.push("teardown-end");
      },
    });

    const GameScene = createScene("game")({
      setup() {
        order.push("game-setup");
      },
    });

    const engine = createEngine({
      systems: [],
      scenes: [MenuScene, GameScene],
    });

    await engine.scene.set("menu");
    await engine.scene.set("game");

    expect(order).toEqual(["menu-setup", "teardown-start", "teardown-end", "game-setup"]);
  });

  it("should prevent concurrent transitions", async () => {
    const MenuScene = createScene("menu")({
      async setup() {
        await new Promise((r) => setTimeout(r, 50));
      },
    });

    const GameScene = createScene("game")({
      setup() {
        /* setup */
      },
    });

    const engine = createEngine({
      systems: [],
      scenes: [MenuScene, GameScene],
    });

    // Start transitioning to menu (takes 50ms)
    const transition1 = engine.scene.set("menu");

    // Try to transition to game while still transitioning
    const transition2 = engine.scene.set("game");

    await expect(transition2).rejects.toThrow("another transition is in progress");

    // First transition should complete successfully
    await transition1;
    expect(engine.scene.current).toBe("menu");
  });
});

describe("initialScene option", () => {
  it("should set initial scene during initialize", async () => {
    const setupFn = vi.fn();
    const MenuScene = createScene("menu")({ setup: setupFn });

    const engine = createEngine({
      systems: [],
      scenes: [MenuScene],
      initialScene: "menu",
    });

    await engine.initialize();

    expect(setupFn).toHaveBeenCalledTimes(1);
    expect(engine.scene.current).toBe("menu");
  });
});

describe("Registry isolation", () => {
  it("should have separate registries per scene", async () => {
    class TestComponent {
      constructor(public value: string) {}
    }

    let menuEntityId: any;

    const MenuScene = createScene("menu")({
      setup() {
        const world = fromContext(ActiveRegistry);
        menuEntityId = world.create();
        world.add(menuEntityId, TestComponent, new TestComponent("menu"));
      },
    });

    const GameScene = createScene("game")({
      setup() {
        const world = fromContext(ActiveRegistry);
        // Should not find the menu entity
        const entities = world.all();
        expect(entities.length).toBe(0);
      },
    });

    const engine = createEngine({
      systems: [],
      scenes: [MenuScene, GameScene],
    });

    await engine.scene.set("menu");
    await engine.scene.set("game");
  });

  it("should provide a fresh Registry on re-entering a scene", async () => {
    let entityCount = 0;

    const MenuScene = createScene("menu")({
      setup() {
        const world = fromContext(ActiveRegistry);
        world.create();
        entityCount = world.all().length;
      },
    });

    const GameScene = createScene("game")({
      setup: () => {
        /* setup */
      },
    });

    const engine = createEngine({
      systems: [],
      scenes: [MenuScene, GameScene],
    });

    // First visit to menu
    await engine.scene.set("menu");
    expect(entityCount).toBe(1);

    // Leave and come back
    await engine.scene.set("game");
    await engine.scene.set("menu");

    // Should have only 1 entity (the new one), not 2
    // The old entity was cleared during transition
    expect(entityCount).toBe(1);
  });
});

describe("SceneManager", () => {
  it("should expose isTransitioning state", async () => {
    const MenuScene = createScene("menu")({
      async setup() {
        await new Promise((r) => setTimeout(r, 10));
      },
    });

    const engine = createEngine({
      systems: [],
      scenes: [MenuScene],
    });

    const transitionPromise = engine.scene.set("menu");

    // Check if transitioning immediately after starting
    const wasTransitioning = engine.scene.isTransitioning;

    await transitionPromise;

    expect(wasTransitioning).toBe(true);
    expect(engine.scene.isTransitioning).toBe(false);
  });

  it("should allow checking if scene exists via has()", () => {
    const MenuScene = createScene("menu")({
      setup: () => {
        /* setup */
      },
    });

    const engine = createEngine({
      systems: [],
      scenes: [MenuScene],
    });

    expect(engine.scene.has("menu")).toBe(true);
    expect(engine.scene.has("nonexistent")).toBe(false);
  });

  it("should expose current scene definition via definition property", async () => {
    const MenuScene = createScene("menu")({
      setup: () => {
        /* setup */
      },
    });

    const engine = createEngine({
      systems: [],
      scenes: [MenuScene],
    });

    expect(engine.scene.definition).toBeNull();

    await engine.scene.set("menu");

    expect(engine.scene.definition).not.toBeNull();
    expect(engine.scene.definition?.name).toBe("menu");
  });

});
