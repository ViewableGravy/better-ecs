import { ConveyorBeltComponent } from "@client/components/conveyor-belt";
import { ConveyorUtils, spawnTransportBelt } from "@client/entities/transport-belt";
import { ConveyorEntityMotionUtils } from "@client/entities/transport-belt/motion/ConveyorEntityMotionUtils";
import { sceneConfig } from "@client/scenes/world/const";
import { defineOverworldContext } from "@client/scenes/world/contexts/define-overworld-context";
import { reconnectPersistedTransportBelts } from "@client/systems/core/persistence/utilities";
import { System as ConveyorEntityMotion } from "@client/systems/world/conveyor-entity-motion";
import { createEngine, EngineTestHarness, type EntityId, type UserWorld } from "@engine";
import { Transform2D } from "@engine/components";
import { registerEngine, unregisterEngine } from "@engine/core/global-engine";
import { resolveWorldTransform2D } from "@engine/ecs/hierarchy";
import { createContextScene } from "@libs/spatial-contexts";
import { applySceneStateToEngine, serializeSceneState } from "@libs/state-sync/scene-state";
import { describe, expect, it } from "vitest";

type WorldPoint = {
  x: number;
  y: number;
};

const CLOCKWISE_LOOP_BELT_POSITIONS: ReadonlyArray<WorldPoint> = [
  { x: -450, y: 426 },
  { x: -430, y: 426 },
  { x: -410, y: 426 },
  { x: -390, y: 426 },
  { x: -370, y: 426 },
  { x: -370, y: 446 },
  { x: -370, y: 466 },
  { x: -370, y: 486 },
  { x: -370, y: 506 },
  { x: -390, y: 506 },
  { x: -410, y: 506 },
  { x: -430, y: 506 },
  { x: -450, y: 506 },
  { x: -450, y: 486 },
  { x: -450, y: 466 },
  { x: -450, y: 446 },
];

const SHARED_WORLD_TRANSFORM = new Transform2D();

describe("clockwise loop persistence", () => {
  it("tracks belt lane and carried-item transform changes in the dirty queue", () => {
    const engine = createEngine({
      manualRegisterEngine: true,
      config: {
        serialization: {
          enableDirtyQueue: true,
        },
      },
    });

    registerEngine(engine as never);

    try {
      const world = engine.scene.context.getDefaultWorld();
      const beltEntityId = spawnTransportBelt(world, {
        x: 0,
        y: 0,
        variant: "horizontal-right",
        connectToNeighbors: false,
      });
      const itemEntityId = world.create();

      ConveyorUtils.addEntity(world, beltEntityId, itemEntityId, "left", 0, 0);
      engine.serialization.drainDiffCommands();

      const conveyor = world.require(beltEntityId, ConveyorBeltComponent);

      ConveyorEntityMotionUtils.advanceConveyor(world, conveyor, null, 1);
      ConveyorEntityMotionUtils.syncConveyorTransforms(world, conveyor);

      expect(engine.serialization.peekDiffCommands()).toEqual(expect.arrayContaining([
        expect.objectContaining({
          entityId: beltEntityId,
          componentType: "ConveyorBeltComponent",
          changes: expect.objectContaining({
            leftProgress: [0.0625, 0, 0, 0],
          }),
        }),
        expect.objectContaining({
          entityId: itemEntityId,
          componentType: "Transform2D",
          changes: expect.objectContaining({
            curr: expect.objectContaining({
              pos: expect.objectContaining({
                x: -9.6875,
                y: -4,
              }),
            }),
          }),
        }),
      ]));
    } finally {
      unregisterEngine();
    }
  });

  it("matches continuous loop motion on the first update after a refresh", async () => {
    const continuousHarness = await createClockwiseLoopHarness();

    continuousHarness.stepUpdates(64);

    const loopBeltIds = findClockwiseLoopBeltIds(continuousHarness.world);
    const trackedItemIds = findLoopItemIds(continuousHarness.world, loopBeltIds);
    const serializedState = serializeSceneState(continuousHarness.engine.scene.context);

    continuousHarness.stepUpdate();

    const continuedPositions = readWorldPositions(continuousHarness.world, trackedItemIds);

    const refreshedHarness = await createClockwiseLoopHarness();

    applySceneStateToEngine(
      refreshedHarness.engine.scene.context,
      refreshedHarness.engine.serialization,
      serializedState,
    );
    reconnectPersistedTransportBelts({
      engine: refreshedHarness.engine,
      scene: refreshedHarness.engine.scene.context,
      serializeSceneState: () => serializeSceneState(refreshedHarness.engine.scene.context),
      applySceneState: (sceneState) => {
        applySceneStateToEngine(
          refreshedHarness.engine.scene.context,
          refreshedHarness.engine.serialization,
          sceneState,
        );
      },
      drainDiffCommands: () => refreshedHarness.engine.serialization.drainDiffCommands(),
    });

    refreshedHarness.stepUpdate();

    const refreshedPositions = readWorldPositions(refreshedHarness.world, trackedItemIds);

    expect(refreshedPositions).toEqual(continuedPositions);
  });
});

async function createClockwiseLoopHarness() {
  const TestScene = createContextScene("ClockwiseLoopPersistenceScene")({
    systems: [ConveyorEntityMotion],
    contexts: [
      defineOverworldContext({
        overworldId: sceneConfig.contextIds.overworld,
        houseId: sceneConfig.contextIds.house,
        dungeonId: sceneConfig.contextIds.dungeon,
        houseHalfWidth: sceneConfig.house.halfWidth,
        houseHalfHeight: sceneConfig.house.halfHeight,
      }),
    ],
  });

  return EngineTestHarness.create({
    scenes: [TestScene],
    initialScene: "ClockwiseLoopPersistenceScene",
  });
}

function findClockwiseLoopBeltIds(world: UserWorld): EntityId[] {
  const beltIdsByPosition = new Map<string, EntityId>();

  world.forEach2(ConveyorBeltComponent, Transform2D, (entityId, _belt, transform) => {
    beltIdsByPosition.set(toPositionKey(transform.curr.pos.x, transform.curr.pos.y), entityId);
  });

  return CLOCKWISE_LOOP_BELT_POSITIONS.map((position) => {
    const beltId = beltIdsByPosition.get(toPositionKey(position.x, position.y));

    if (beltId === undefined) {
      throw new Error(`Missing clockwise loop belt at ${position.x},${position.y}`);
    }

    return beltId;
  });
}

function findLoopItemIds(world: UserWorld, beltIds: readonly EntityId[]): EntityId[] {
  const itemIds = new Set<EntityId>();

  for (const beltId of beltIds) {
    const conveyor = world.require(beltId, ConveyorBeltComponent);

    for (const entityId of [...conveyor.left, ...conveyor.right]) {
      if (entityId !== null) {
        itemIds.add(entityId);
      }
    }
  }

  return [...itemIds].sort((left, right) => left - right);
}

function readWorldPositions(world: UserWorld, itemIds: readonly EntityId[]) {
  return itemIds.map((entityId) => {
    expect(resolveWorldTransform2D(world, entityId, SHARED_WORLD_TRANSFORM)).toBe(true);

    return {
      entityId,
      x: SHARED_WORLD_TRANSFORM.curr.pos.x,
      y: SHARED_WORLD_TRANSFORM.curr.pos.y,
    };
  });
}

function toPositionKey(x: number, y: number): string {
  return `${x},${y}`;
}