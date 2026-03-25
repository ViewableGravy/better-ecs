import { ConveyorBeltComponent, type ConveyorSide, type ConveyorSlotIndex } from "@client/components/conveyor-belt";
import { ConveyorUtils, spawnTransportBelt } from "@client/entities/transport-belt";
import { BeltItemRailsUtility } from "@client/entities/transport-belt/motion/BeltItemRailsUtility";
import { ConveyorEntityMotionUtils } from "@client/entities/transport-belt/motion/ConveyorEntityMotionUtils";
import { sceneConfig } from "@client/scenes/world/const";
import { defineOverworldContext } from "@client/scenes/world/contexts/define-overworld-context";
import { reconnectPersistedTransportBelts } from "@client/systems/core/persistence/utilities";
import { System as ConveyorEntityMotion } from "@client/systems/world/conveyor-entity-motion";
import { createEngine, EngineTestHarness, Vec2, type EntityId, type SerializedObject, type UserWorld } from "@engine";
import { Parent, Transform2D } from "@engine/components";
import { registerEngine, unregisterEngine } from "@engine/core/global-engine";
import { createContextScene } from "@libs/spatial-contexts";
import type { SerializedSceneState } from "@libs/state-sync/scene-state";
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

const CONVEYOR_SIDES: readonly ConveyorSide[] = ["left", "right"];
const CONVEYOR_SLOT_INDICES: readonly ConveyorSlotIndex[] = [0, 1, 2, 3];
const SHARED_SLOT_POSITION = new Vec2();

describe("clockwise loop persistence", () => {
  it("keeps lane progress out of persisted diffs while still tracking carried-item transforms", () => {
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

      const diffCommands = engine.serialization.peekDiffCommands();

      expect(diffCommands).not.toEqual(expect.arrayContaining([
        expect.objectContaining({
          componentType: "ConveyorBeltComponent",
          changes: expect.objectContaining({
            leftProgress: expect.anything(),
          }),
        }),
      ]));
      expect(diffCommands).toEqual(expect.arrayContaining([
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

  it("rebuilds carried-item visuals from slot occupancy during hydration without serialized lane progress", async () => {
    const continuousHarness = await createClockwiseLoopHarness();

    continuousHarness.stepUpdates(64);

    const loopBeltIds = findClockwiseLoopBeltIds(continuousHarness.world);
    const serializedState = stripConveyorLaneProgress(
      serializeSceneState(continuousHarness.engine.scene.context),
    );

    const refreshedHarness = await createClockwiseLoopHarness();

    applySceneStateToEngine(
      refreshedHarness.engine.scene.context,
      refreshedHarness.engine.serialization,
      serializedState,
    );
    reconnectPersistedTransportBelts({
      engine: refreshedHarness.engine,
    });

    expectHydratedLoopVisualState(refreshedHarness.world, loopBeltIds);
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

function stripConveyorLaneProgress(sceneState: SerializedSceneState): SerializedSceneState {
  return {
    ...sceneState,
    worlds: sceneState.worlds.map((sceneWorld) => ({
      ...sceneWorld,
      world: {
        ...sceneWorld.world,
        entities: sceneWorld.world.entities.map((entity) => ({
          ...entity,
          components: entity.components.map((component) => {
            if (component.type !== "ConveyorBeltComponent") {
              return component;
            }

            const componentData: SerializedObject = { ...component.data };
            delete componentData.leftProgress;
            delete componentData.rightProgress;

            return {
              ...component,
              data: componentData,
            };
          }),
        })),
      },
    })),
  };
}

function expectHydratedLoopVisualState(world: UserWorld, beltIds: readonly EntityId[]): void {
  for (const beltId of beltIds) {
    const conveyor = world.require(beltId, ConveyorBeltComponent);

    expect(conveyor.leftProgress).toEqual([0, 0, 0, 0]);
    expect(conveyor.rightProgress).toEqual([0, 0, 0, 0]);

    for (const side of CONVEYOR_SIDES) {
      const slots = side === "left" ? conveyor.left : conveyor.right;

      for (const index of CONVEYOR_SLOT_INDICES) {
        const entityId = slots[index];

        if (entityId === null) {
          continue;
        }

        const parent = world.require(entityId, Parent);
        const transform = world.require(entityId, Transform2D);

        expect(parent.entityId).toBe(beltId);

        BeltItemRailsUtility.resolvePositionInto(conveyor.variant, side, index, 0, SHARED_SLOT_POSITION);

        expect(transform.curr.pos.x).toBe(SHARED_SLOT_POSITION.x);
        expect(transform.curr.pos.y).toBe(SHARED_SLOT_POSITION.y);
        expect(transform.prev.pos.x).toBe(SHARED_SLOT_POSITION.x);
        expect(transform.prev.pos.y).toBe(SHARED_SLOT_POSITION.y);
      }
    }
  }
}

function toPositionKey(x: number, y: number): string {
  return `${x},${y}`;
}