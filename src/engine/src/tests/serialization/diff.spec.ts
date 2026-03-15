import { describe, expect, it } from "vitest";

import { Transform2D } from "@engine/components/transform/transform2d";
import { createEngine } from "@engine/core/factory";
import { registerEngine, unregisterEngine } from "@engine/core/global-engine";
import { Component } from "@engine/ecs/component";
import { SerializableComponent, mutate, serializable, type DiffCommand } from "@engine/serialization";

class Marker extends Component {
  declare public value: string;

  constructor(value: string = "") {
    super();
    this.value = value;
  }
}

serializable("string")(Marker.prototype, "value");
SerializableComponent(Marker);

function createTrackedEngine() {
  const engine = createEngine({
    manualRegisterEngine: true,
    config: {
      serialization: {
        enableDirtyQueue: true,
      },
    },
  });

  registerEngine(engine as never);

  return {
    engine,
    world: engine.scene.context.getDefaultWorld(),
    serialization: engine.serialization,
  };
}

function drain(engine: ReturnType<typeof createTrackedEngine>): DiffCommand[] {
  return engine.serialization.drainDiffCommands();
}

describe("engine diff tracking", () => {
  it("tracks direct serializable field assignment", () => {
    const engine = createTrackedEngine();
    const entityId = engine.world.create();
    const marker = new Marker("initial");

    engine.world.add(entityId, marker);
    drain(engine);

    marker.value = "updated";

    expect(marker.dirty).toBe(true);
    expect(engine.serialization.peekDiffCommands()).toEqual([
      {
        op: "set-field",
        version: marker.version,
        worldId: "default",
        entityId,
        componentType: "Marker",
        changes: {
          value: "updated",
        },
      },
    ]);

    drain(engine);

    expect(marker.dirty).toBe(false);
  });

  it("tracks nested writes on serializable object graphs", () => {
    const engine = createTrackedEngine();
    const entityId = engine.world.create();
    const transform = new Transform2D();

    engine.world.add(entityId, transform);
    drain(engine);

    mutate(transform, "curr", (curr) => {
      curr.pos.x = 42;
    });

    expect(engine.serialization.peekDiffCommands()).toEqual([
      {
        op: "set-field",
        version: transform.version,
        worldId: "default",
        entityId,
        componentType: "Transform2D",
        changes: {
          curr: {
            pos: {
              x: 42,
              y: 0,
            },
            rotation: 0,
            scale: {
              x: 1,
              y: 1,
            },
          },
        },
      },
    ]);
  });

  it("tracks structural mutations and replays them in order", () => {
    const source = createTrackedEngine();
    const entityId = source.world.create();
    const marker = new Marker("one");

    source.world.add(entityId, marker);
    const createdCommands = drain(source);

    marker.value = "two";
    const updateCommands = drain(source);

    source.world.remove(entityId, Marker);
    const removalCommands = drain(source);

    source.world.add(entityId, new Marker("three"));
    source.world.destroy(entityId);
    const finalCommands = drain(source);

    unregisterEngine();

    const target = createTrackedEngine();

    target.serialization.applyDiffCommands(createdCommands);
    expect(target.world.get(entityId, Marker)?.value).toBe("one");

    target.serialization.applyDiffCommands(updateCommands);
    expect(target.world.get(entityId, Marker)?.value).toBe("two");

    target.serialization.applyDiffCommands(removalCommands);
    expect(target.world.get(entityId, Marker)).toBeUndefined();

    target.serialization.applyDiffCommands(finalCommands);
    expect(target.world.get(entityId, Marker)).toBeUndefined();
    expect(target.world.all()).toEqual([]);
    expect(target.serialization.peekDiffCommands()).toEqual([]);
  });
});