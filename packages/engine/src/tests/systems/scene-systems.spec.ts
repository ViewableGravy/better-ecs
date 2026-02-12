import { describe, expect, it } from "vitest";
import z from "zod";

import { createEngine, createScene, createSystem, useScene } from "../../core";

describe("Scene-level systems", () => {
  it("should run scene systems after engine systems (update phase)", async () => {
    const order: string[] = [];
    const controller = new AbortController();

    const EngineOrderSystem = createSystem("test:engine-order")({
      schema: {
        default: null,
        schema: z.null(),
      },
      phase: "update",
      priority: 10_000,
      system() {
        order.push("engine");
      },
    });

    const SceneOrderSystem = createSystem("test:scene-order")({
      schema: {
        default: null,
        schema: z.null(),
      },
      phase: "update",
      priority: 10_000,
      system() {
        const scene = useScene();
        order.push(`scene:${scene.name}`);

        if (order.length >= 2) {
          controller.abort();
        }
      },
    });

    const GameScene = createScene("game")({
      systems: [SceneOrderSystem],
      setup() {
        // no-op
      },
    });

    const engine = createEngine({
      systems: [EngineOrderSystem],
      scenes: [GameScene],
      initialScene: "game",
    });

    // Wait until the aborting scene system runs.
    for await (const tick of engine.startEngine({
      fps: 1000,
      ups: 1000,
      signal: controller.signal,
    })) {
      void tick;
      if (controller.signal.aborted) break;
    }

    const engineIndex = order.indexOf("engine");
    const sceneIndex = order.findIndex((v) => v === "scene:game");

    expect(engineIndex).toBeGreaterThanOrEqual(0);
    expect(sceneIndex).toBeGreaterThanOrEqual(0);
    expect(engineIndex).toBeLessThan(sceneIndex);
  });

  it("useScene() should throw when no scene is active", async () => {
    const controller = new AbortController();

    const ThrowingSystem = createSystem("test:useScene-throws")({
      schema: {
        default: null,
        schema: z.null(),
      },
      phase: "update",
      system() {
        // No active scene: should throw
        useScene();
      },
    });

    const engine = createEngine({
      systems: [ThrowingSystem],
      scenes: [],
    });

    // Consume a single tick to trigger system execution.
    await expect(
      (async () => {
        for await (const tick of engine.startEngine({
          fps: 1000,
          ups: 1000,
          signal: controller.signal,
        })) {
          void tick;
          // Stop if we somehow got here
          controller.abort();
        }
      })(),
    ).rejects.toThrow("useScene() called outside of scene context");
  });
});
