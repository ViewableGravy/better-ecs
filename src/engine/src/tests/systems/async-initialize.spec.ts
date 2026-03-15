import { createEngine, createScene, createSystem } from "@engine/core";
import { describe, expect, it } from "vitest";

describe("async system initialize", () => {
  it("awaits scene-system initialization after scene setup", async () => {
    const order: string[] = [];

    const SceneSystem = createSystem("test:async-initialize")({
      async initialize() {
        order.push("initialize:start");
        await Promise.resolve();
        order.push("initialize:end");
      },
      system() {
        order.push("system");
      },
    });

    const GameScene = createScene("game")({
      systems: [SceneSystem],
      async setup() {
        order.push("setup");
      },
    });

    const engine = createEngine({
      scenes: [GameScene],
      initialScene: "game",
    });

    await engine.initialize();

    expect(order).toEqual(["setup", "initialize:start", "initialize:end"]);
  });
});