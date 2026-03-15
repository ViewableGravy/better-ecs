import { describe, expect, it } from "vitest";

import { AnimatedSprite } from "../../components/sprite/animated/component";
import { Transform2D } from "../../components/transform/transform2d";
import { createEngine } from "../../core/factory";
import { registerEngine, unregisterEngine } from "../../core/global-engine";
import { Component } from "../../ecs/component";
import { SerializableComponent, mutate, serializable, type DiffCommand } from "../../serialization";

class Marker extends Component {
  declare public value: string;

  constructor(value: string = "") {
    super();
    this.value = value;
  }
}

serializable("string")(Marker.prototype, "value");
SerializableComponent(Marker);

class BigMarker extends Component {
  declare public value: bigint;

  constructor(value: bigint = 0n) {
    super();
    this.value = value;
  }
}

serializable("bigint")(BigMarker.prototype, "value");
SerializableComponent(BigMarker);

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

    mutate(transform, "curr", (curr: Transform2D["curr"]) => {
      curr.pos.x = 42;
    });

    expect(engine.serialization.peekDiffCommands()).toEqual([
      {
        op: "set-field",
        version: expect.any(Number),
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

  it("replays constructor-backed sprite components from serialized diffs", () => {
    const source = createTrackedEngine();
    const entityId = source.world.create();

    source.world.add(entityId, new AnimatedSprite({
      assets: ["player-idle:s_1", "player-idle:s_2"],
      width: 35,
      height: 35,
      anchorY: 0.8,
      playbackRate: 0.15,
      useGlobalOffset: true,
    }));

    const commands = drain(source);

    unregisterEngine();

    const target = createTrackedEngine();

    target.serialization.applyDiffCommands(commands);

    const sprite = target.world.get(entityId, AnimatedSprite);

    expect(sprite).toBeDefined();
    expect(sprite?.frames).toEqual(["player-idle:s_1", "player-idle:s_2"]);
    expect(sprite?.width).toBe(35);
    expect(sprite?.height).toBe(35);
    expect(sprite?.anchorY).toBe(0.8);
    expect(sprite?.playbackRate).toBe(0.15);
    expect(sprite?.useGlobalOffset).toBe(true);
  });

  it("restores bigint fields using their declared serializable type", () => {
    const source = createTrackedEngine();
    const entityId = source.world.create();
    const marker = new BigMarker(7n);

    source.world.add(entityId, marker);
    drain(source);

    marker.value = 13n;
    const commands = drain(source);

    unregisterEngine();

    const target = createTrackedEngine();
    target.world.createWithId(entityId);
    target.world.add(entityId, new BigMarker(1n));
    drain(target);

    target.serialization.applyDiffCommands(commands);

    expect(target.world.get(entityId, BigMarker)?.value).toBe(13n);
  });
});