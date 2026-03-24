import { createScene, createSystem } from "@engine/core";
import { EngineTestHarness } from "@engine/testing";
import { describe, expect, it } from "vitest";

describe("EngineTestHarness", () => {
  it("runs real scene systems through stepUpdate", async () => {
    const observed: number[] = [];

    const CounterSystem = createSystem("test:counter")({
      system() {
        observed.push(observed.length + 1);
      },
    });

    const TestScene = createScene("test")({
      systems: [CounterSystem],
      setup() {
        // no-op
      },
    });

    const harness = await EngineTestHarness.create({
      scenes: [TestScene],
      initialScene: "test",
    });

    harness.stepUpdates(3);

    expect(observed).toEqual([1, 2, 3]);
    expect(harness.engine.meta.updateTick).toBe(3);
  });
});