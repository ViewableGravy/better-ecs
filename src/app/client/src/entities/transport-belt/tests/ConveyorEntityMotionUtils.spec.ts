import { ConveyorBeltComponent } from "@client/components/conveyor-belt";
import { TransportBeltLeaf } from "@client/components/transport-belt-leaf";
import {
    CONVEYOR_SLOT_COUNT_PER_LANE,
    ConveyorBeltChainIterator, ConveyorSideLoadUtils, ConveyorUtils, destroyTransportBelt, getCurveLaneSides,
    getSlotAdvanceDurations,
    INSIDE_CURVE_SLOT_ADVANCE_DURATION_MS,
    INSIDE_CURVE_SPEED_MULTIPLIER, ConveyorEntityMotionUtils as RuntimeConveyorEntityMotionUtils, SLOT_ADVANCE_DURATION_MS, spawnTransportBelt
} from "@client/entities/transport-belt";
import { TransportBeltGhost } from "@client/entities/transport-belt/ghost";
import type { ConveyorSideLoadTransfer } from "@client/entities/transport-belt/motion/types";
import { TransportBeltAutoShapeManager } from "@client/entities/transport-belt/placement/TransportBeltAutoShapeManager";
import { PhysicsWorldManager } from "@client/scenes/world/physics/physics-world-manager";
import { GridSingleton } from "@client/systems/world/build-mode/grid-singleton";
import { Placement } from "@client/systems/world/build-mode/placement";
import { UserWorld, World, type EntityId } from "@engine";
import { Parent, Transform2D } from "@engine/components";
import { resolveWorldTransform2D } from "@engine/ecs/hierarchy";
import { describe, expect, it } from "vitest";

const SHARED_WORLD_TRANSFORM = new Transform2D();
const SHARED_BELT_CHAIN_ITERATOR = new ConveyorBeltChainIterator();
const SHARED_CONVEYOR_ENTITY_MOTION_UTILS = new RuntimeConveyorEntityMotionUtils();
const SHARED_DEFERRED_SIDE_LOADS: ConveyorSideLoadTransfer[] = [];
const SHARED_CONVEYORS_TO_SYNC = new Set<EntityId>();

const ConveyorEntityMotionUtils = {
  advanceBeltLineFromLeaf(world: UserWorld, leafEntityId: EntityId, updateDelta: number): void {
    SHARED_BELT_CHAIN_ITERATOR.setLeaf(world, leafEntityId);
    SHARED_CONVEYOR_ENTITY_MOTION_UTILS.set(
      world,
      updateDelta,
      SHARED_BELT_CHAIN_ITERATOR.getInitialNextEntityId(),
    );

    for (const conveyorEntityId of SHARED_BELT_CHAIN_ITERATOR.iterate()) {
      SHARED_CONVEYOR_ENTITY_MOTION_UTILS.advanceConveyorEntity(conveyorEntityId);
    }

    for (const conveyorEntityId of SHARED_BELT_CHAIN_ITERATOR.iterate()) {
      SHARED_CONVEYOR_ENTITY_MOTION_UTILS.syncConveyorEntityTransforms(conveyorEntityId);
    }
  },
  advanceWorld(world: UserWorld, updateDelta: number): void {
    if (updateDelta <= 0) {
      return;
    }

    SHARED_DEFERRED_SIDE_LOADS.length = 0;
    SHARED_CONVEYORS_TO_SYNC.clear();

    world.forEach2(TransportBeltLeaf, ConveyorBeltComponent, (conveyorEntityId, _, conveyor) => {
      if (!ConveyorUtils.supportsItemAnimation(conveyor.variant)) {
        return;
      }

      ConveyorEntityMotionUtils.advanceBeltLineFromLeaf(world, conveyorEntityId, updateDelta);

      const sideLoadTransfer = ConveyorSideLoadUtils.resolveDeferredTransfer(world, conveyorEntityId);

      if (sideLoadTransfer !== null) {
        SHARED_DEFERRED_SIDE_LOADS.push(sideLoadTransfer);
      }
    });

    for (const sideLoadTransfer of SHARED_DEFERRED_SIDE_LOADS) {
      if (!RuntimeConveyorEntityMotionUtils.transferSideLoad(world, sideLoadTransfer)) {
        continue;
      }

      SHARED_CONVEYORS_TO_SYNC.add(sideLoadTransfer.sourceEntityId);
      SHARED_CONVEYORS_TO_SYNC.add(sideLoadTransfer.targetEntityId);
    }

    for (const conveyorEntityId of SHARED_CONVEYORS_TO_SYNC) {
      const conveyor = world.get(conveyorEntityId, ConveyorBeltComponent);

      if (!conveyor) {
        continue;
      }

      RuntimeConveyorEntityMotionUtils.syncConveyorTransforms(world, conveyor);
    }
  },
  advanceConveyor: RuntimeConveyorEntityMotionUtils.advanceConveyor.bind(RuntimeConveyorEntityMotionUtils),
  syncConveyorTransforms: RuntimeConveyorEntityMotionUtils.syncConveyorTransforms.bind(RuntimeConveyorEntityMotionUtils),
};

describe("ConveyorEntityMotionUtils.advanceConveyor", () => {
  it("advances later slots first so earlier slots can move into newly freed space", () => {
    const world = new UserWorld(new World("scene"));
    const conveyorEntityId = world.create();
    const conveyor = new ConveyorBeltComponent("horizontal-right");
    const slot0EntityId = world.create();
    const slot1EntityId = world.create();

    world.add(conveyorEntityId, conveyor);
    world.add(slot0EntityId, new Transform2D());
    world.add(slot1EntityId, new Transform2D());

    conveyor.left[0] = slot0EntityId;
    conveyor.left[1] = slot1EntityId;
    conveyor.leftProgress[0] = 1;
    conveyor.leftProgress[1] = 1;

    ConveyorEntityMotionUtils.advanceConveyor(world, conveyor, null, null, 0);
    ConveyorEntityMotionUtils.syncConveyorTransforms(world, conveyor);

    expect(conveyor.left).toEqual([null, slot0EntityId, slot1EntityId, null]);
    expect(conveyor.leftProgress).toEqual([0, 0, 0, 0]);

    const slot0Transform = world.require(slot0EntityId, Transform2D);
    const slot1Transform = world.require(slot1EntityId, Transform2D);

    expect(slot0Transform.curr.pos.x).toBe(-5);
    expect(slot0Transform.curr.pos.y).toBe(-4);
    expect(slot1Transform.curr.pos.x).toBe(0);
    expect(slot1Transform.curr.pos.y).toBe(-4);
  });

  it("moves three cogs with mixed spacing without stalling open slots", () => {
    const world = new UserWorld(new World("scene"));
    const conveyorEntityId = world.create();
    const conveyor = new ConveyorBeltComponent("vertical-up");
    const slot0EntityId = world.create();
    const slot2EntityId = world.create();
    const right1EntityId = world.create();

    world.add(conveyorEntityId, conveyor);
    world.add(slot0EntityId, new Transform2D());
    world.add(slot2EntityId, new Transform2D());
    world.add(right1EntityId, new Transform2D());

    conveyor.left[0] = slot0EntityId;
    conveyor.left[2] = slot2EntityId;
    conveyor.right[1] = right1EntityId;
    conveyor.leftProgress[0] = 1;
    conveyor.leftProgress[2] = 1;
    conveyor.rightProgress[1] = 1;

    ConveyorEntityMotionUtils.advanceConveyor(world, conveyor, null, null, 0);
    ConveyorEntityMotionUtils.syncConveyorTransforms(world, conveyor);

    expect(conveyor.left).toEqual([null, slot0EntityId, null, slot2EntityId]);
    expect(conveyor.right).toEqual([null, null, right1EntityId, null]);
    expect(conveyor.leftProgress).toEqual([0, 0, 0, 0]);
    expect(conveyor.rightProgress).toEqual([0, 0, 0, 0]);
  });

  it("moves four cogs across both lanes without cross-lane deadlock", () => {
    const world = new UserWorld(new World("scene"));
    const conveyorEntityId = world.create();
    const conveyor = new ConveyorBeltComponent("vertical-down");
    const left0EntityId = world.create();
    const left1EntityId = world.create();
    const left2EntityId = world.create();
    const right0EntityId = world.create();

    world.add(conveyorEntityId, conveyor);
    world.add(left0EntityId, new Transform2D());
    world.add(left1EntityId, new Transform2D());
    world.add(left2EntityId, new Transform2D());
    world.add(right0EntityId, new Transform2D());

    conveyor.left[0] = left0EntityId;
    conveyor.left[1] = left1EntityId;
    conveyor.left[2] = left2EntityId;
    conveyor.right[0] = right0EntityId;
    conveyor.leftProgress[0] = 1;
    conveyor.leftProgress[1] = 1;
    conveyor.leftProgress[2] = 1;
    conveyor.rightProgress[0] = 1;

    ConveyorEntityMotionUtils.advanceConveyor(world, conveyor, null, null, 0);
    ConveyorEntityMotionUtils.syncConveyorTransforms(world, conveyor);

    expect(conveyor.left).toEqual([null, left0EntityId, left1EntityId, left2EntityId]);
    expect(conveyor.right).toEqual([null, right0EntityId, null, null]);
    expect(conveyor.leftProgress).toEqual([0, 0, 0, 0]);
    expect(conveyor.rightProgress).toEqual([0, 0, 0, 0]);
  });

  it("keeps the tail slot occupied when there is no downstream conveyor", () => {
    const world = new UserWorld(new World("scene"));
    const conveyorEntityId = world.create();
    const conveyor = new ConveyorBeltComponent("horizontal-right");
    const entityId = world.create();

    world.add(conveyorEntityId, conveyor);
    world.add(entityId, new Transform2D());

    conveyor.right[3] = entityId;
    conveyor.rightProgress[3] = 1;

    ConveyorEntityMotionUtils.advanceConveyor(world, conveyor, null, null, 0);
    ConveyorEntityMotionUtils.syncConveyorTransforms(world, conveyor);

    expect(conveyor.right).toEqual([null, null, null, entityId]);
    expect(conveyor.rightProgress).toEqual([0, 0, 0, 1]);

    const transform = world.require(entityId, Transform2D);

    expect(transform.curr.pos.x).toBe(10);
    expect(transform.curr.pos.y).toBe(4);
  });

  it("does not carry stalled tail progress into a newly connected conveyor", () => {
    const world = new UserWorld(new World("scene"));
    const headBeltId = world.create();
    const tailBeltId = world.create();
    const headBelt = new ConveyorBeltComponent("horizontal-right");
    const tailBelt = new ConveyorBeltComponent("horizontal-right");
    const entityId = world.create();

    headBelt.isLeaf = true;

    world.add(headBeltId, headBelt);
    world.add(tailBeltId, tailBelt);
    world.add(headBeltId, new Transform2D(0, 0, 0));
    world.add(tailBeltId, new Transform2D(20, 0, 0));
    world.add(headBeltId, new TransportBeltLeaf());
    world.add(entityId, new Parent(headBeltId));
    world.add(entityId, new Transform2D());

    headBelt.left[3] = entityId;
    headBelt.leftProgress[3] = 1;

    ConveyorEntityMotionUtils.advanceBeltLineFromLeaf(
      world,
      headBeltId,
      SLOT_ADVANCE_DURATION_MS / CONVEYOR_SLOT_COUNT_PER_LANE,
    );

    headBelt.isLeaf = false;
    tailBelt.isLeaf = true;
    headBelt.nextEntityId = tailBeltId;
    tailBelt.previousEntityId = headBeltId;
    world.remove(headBeltId, TransportBeltLeaf);
    world.add(tailBeltId, new TransportBeltLeaf());

    ConveyorEntityMotionUtils.advanceBeltLineFromLeaf(
      world,
      tailBeltId,
      SLOT_ADVANCE_DURATION_MS / CONVEYOR_SLOT_COUNT_PER_LANE,
    );

    expect(headBelt.left).toEqual([null, null, null, null]);
    expect(tailBelt.left).toEqual([entityId, null, null, null]);
    expect(tailBelt.leftProgress).toEqual([0, 0, 0, 0]);

    const transform = world.require(entityId, Transform2D);

    expect(transform.curr.pos.x).toBe(-10);
    expect(transform.curr.pos.y).toBe(-4);
  });

  it("does not transfer an end-of-line item into a ghost belt preview", () => {
    const world = new UserWorld(new World("scene"));
    const headBeltId = spawnTransportBelt(world, { x: 0, y: 0, variant: "horizontal-right" });
    const entityId = world.create();

    world.add(entityId, new Parent(headBeltId));
    world.add(entityId, new Transform2D());

    const headBelt = world.require(headBeltId, ConveyorBeltComponent);
    headBelt.left[3] = entityId;
    headBelt.leftProgress[3] = 1;

    TransportBeltGhost.spawn(world, 20, -20, "horizontal-right");
    TransportBeltAutoShapeManager.refreshBeltsNearCoordinates(
      world,
      GridSingleton.worldToGridCoordinates(20, 0),
    );

    ConveyorEntityMotionUtils.advanceBeltLineFromLeaf(world, headBeltId, 0);

    expect(headBelt.left).toEqual([null, null, null, entityId]);
    expect(headBelt.leftProgress[3]).toBe(1);
    expect(world.require(entityId, Parent).entityId).toBe(headBeltId);
  });

  it("keeps straight belts on the same timing as the previous full-belt duration", () => {
    const world = new UserWorld(new World("scene"));
    const conveyorEntityId = world.create();
    const conveyor = new ConveyorBeltComponent("horizontal-right");
    const entityId = world.create();

    world.add(conveyorEntityId, conveyor);
    world.add(entityId, new Transform2D());

    conveyor.left[0] = entityId;

    ConveyorEntityMotionUtils.advanceConveyor(
      world,
      conveyor,
      null,
      null,
      SLOT_ADVANCE_DURATION_MS / CONVEYOR_SLOT_COUNT_PER_LANE,
    );

    expect(conveyor.left).toEqual([null, entityId, null, null]);
    expect(conveyor.leftProgress).toEqual([0, 0, 0, 0]);
  });

  it("moves items into the next connected conveyor when traversing from the leaf", () => {
    const world = new UserWorld(new World("scene"));
    const headBeltId = world.create();
    const tailBeltId = world.create();
    const headBelt = new ConveyorBeltComponent("horizontal-right");
    const tailBelt = new ConveyorBeltComponent("horizontal-right");
    const entityId = world.create();

    headBelt.nextEntityId = tailBeltId;
    tailBelt.previousEntityId = headBeltId;

    world.add(headBeltId, headBelt);
    world.add(tailBeltId, tailBelt);
    world.add(headBeltId, new Transform2D(0, 0, 0));
    world.add(tailBeltId, new Transform2D(20, 0, 0));
    tailBelt.isLeaf = true;
    world.add(tailBeltId, new TransportBeltLeaf());
    world.add(entityId, new Parent(headBeltId));
    world.add(entityId, new Transform2D());

    headBelt.left[3] = entityId;
    headBelt.leftProgress[3] = 1;

    ConveyorEntityMotionUtils.advanceBeltLineFromLeaf(world, tailBeltId, 0);

    expect(headBelt.left).toEqual([null, null, null, null]);
    expect(tailBelt.left).toEqual([entityId, null, null, null]);
    expect(tailBelt.leftProgress).toEqual([0, 0, 0, 0]);
    expect(world.require(entityId, Parent).entityId).toBe(tailBeltId);

    const transform = world.require(entityId, Transform2D);

    expect(transform.curr.pos.x).toBe(-10);
    expect(transform.curr.pos.y).toBe(-4);
    expect(resolveWorldTransform2D(world, entityId, SHARED_WORLD_TRANSFORM)).toBe(true);
    expect(SHARED_WORLD_TRANSFORM.curr.pos.x).toBe(10);
    expect(SHARED_WORLD_TRANSFORM.curr.pos.y).toBe(-4);
  });

  it("moves items from a curve into the next connected straight conveyor", () => {
    const world = new UserWorld(new World("scene"));
    const curveBeltId = world.create();
    const tailBeltId = world.create();
    const curveBelt = new ConveyorBeltComponent("angled-left-up");
    const tailBelt = new ConveyorBeltComponent("vertical-up");
    const entityId = world.create();

    curveBelt.nextEntityId = tailBeltId;
    tailBelt.previousEntityId = curveBeltId;

    world.add(curveBeltId, curveBelt);
    world.add(tailBeltId, tailBelt);
    world.add(curveBeltId, new Transform2D(20, 0, 0));
    world.add(tailBeltId, new Transform2D(20, -20, 0));
    tailBelt.isLeaf = true;
    world.add(tailBeltId, new TransportBeltLeaf());
    world.add(entityId, new Parent(curveBeltId));
    world.add(entityId, new Transform2D());

    curveBelt.left[3] = entityId;
    curveBelt.leftProgress[3] = 1;

    ConveyorEntityMotionUtils.advanceBeltLineFromLeaf(world, tailBeltId, 0);

    expect(curveBelt.left).toEqual([null, null, null, null]);
    expect(tailBelt.left).toEqual([entityId, null, null, null]);
    expect(world.require(entityId, Parent).entityId).toBe(tailBeltId);
    expect(resolveWorldTransform2D(world, entityId, SHARED_WORLD_TRANSFORM)).toBe(true);
    expect(SHARED_WORLD_TRANSFORM.curr.pos.x).toBe(16);
    expect(SHARED_WORLD_TRANSFORM.curr.pos.y).toBe(-10);
  });

  it("advances a closed loop from its designated leaf anchor without revisiting it forever", () => {
    const world = new UserWorld(new World("scene"));
    const anchorBeltId = world.create();
    const secondBeltId = world.create();
    const thirdBeltId = world.create();
    const fourthBeltId = world.create();
    const anchorBelt = new ConveyorBeltComponent("angled-bottom-right");
    const secondBelt = new ConveyorBeltComponent("angled-left-bottom");
    const thirdBelt = new ConveyorBeltComponent("angled-top-left");
    const fourthBelt = new ConveyorBeltComponent("angled-right-up");
    const entityId = world.create();

    anchorBelt.previousEntityId = fourthBeltId;
    anchorBelt.nextEntityId = secondBeltId;
    anchorBelt.isLeaf = true;
    secondBelt.previousEntityId = anchorBeltId;
    secondBelt.nextEntityId = thirdBeltId;
    thirdBelt.previousEntityId = secondBeltId;
    thirdBelt.nextEntityId = fourthBeltId;
    fourthBelt.previousEntityId = thirdBeltId;
    fourthBelt.nextEntityId = anchorBeltId;

    world.add(anchorBeltId, anchorBelt);
    world.add(secondBeltId, secondBelt);
    world.add(thirdBeltId, thirdBelt);
    world.add(fourthBeltId, fourthBelt);
    world.add(anchorBeltId, new Transform2D(0, 0, 0));
    world.add(secondBeltId, new Transform2D(20, 0, 0));
    world.add(thirdBeltId, new Transform2D(20, 20, 0));
    world.add(fourthBeltId, new Transform2D(0, 20, 0));
    world.add(anchorBeltId, new TransportBeltLeaf());
    world.add(entityId, new Parent(fourthBeltId));
    world.add(entityId, new Transform2D());

    fourthBelt.left[3] = entityId;
    fourthBelt.leftProgress[3] = 1;

    ConveyorEntityMotionUtils.advanceBeltLineFromLeaf(world, anchorBeltId, 0);

    expect(fourthBelt.left).toEqual([null, null, null, null]);
    expect(anchorBelt.left).toEqual([entityId, null, null, null]);
    expect(world.require(entityId, Parent).entityId).toBe(anchorBeltId);
  });

  it("lets the designated loop anchor transfer into its downstream belt", () => {
    const world = new UserWorld(new World("scene"));
    const anchorBeltId = world.create();
    const secondBeltId = world.create();
    const thirdBeltId = world.create();
    const fourthBeltId = world.create();
    const anchorBelt = new ConveyorBeltComponent("angled-bottom-right");
    const secondBelt = new ConveyorBeltComponent("angled-left-bottom");
    const thirdBelt = new ConveyorBeltComponent("angled-top-left");
    const fourthBelt = new ConveyorBeltComponent("angled-right-up");
    const entityId = world.create();

    anchorBelt.previousEntityId = fourthBeltId;
    anchorBelt.nextEntityId = secondBeltId;
    anchorBelt.isLeaf = true;
    secondBelt.previousEntityId = anchorBeltId;
    secondBelt.nextEntityId = thirdBeltId;
    thirdBelt.previousEntityId = secondBeltId;
    thirdBelt.nextEntityId = fourthBeltId;
    fourthBelt.previousEntityId = thirdBeltId;
    fourthBelt.nextEntityId = anchorBeltId;

    world.add(anchorBeltId, anchorBelt);
    world.add(secondBeltId, secondBelt);
    world.add(thirdBeltId, thirdBelt);
    world.add(fourthBeltId, fourthBelt);
    world.add(anchorBeltId, new Transform2D(0, 0, 0));
    world.add(secondBeltId, new Transform2D(20, 0, 0));
    world.add(thirdBeltId, new Transform2D(20, 20, 0));
    world.add(fourthBeltId, new Transform2D(0, 20, 0));
    world.add(anchorBeltId, new TransportBeltLeaf());
    world.add(entityId, new Parent(anchorBeltId));
    world.add(entityId, new Transform2D());

    anchorBelt.left[3] = entityId;
    anchorBelt.leftProgress[3] = 1;

    ConveyorEntityMotionUtils.advanceBeltLineFromLeaf(world, anchorBeltId, 0);

    expect(anchorBelt.left).toEqual([null, null, null, null]);
    expect(secondBelt.left).toEqual([entityId, null, null, null]);
    expect(world.require(entityId, Parent).entityId).toBe(secondBeltId);
  });

  it("keeps loop items moving when adding an adjacent non-connecting belt", () => {
    const world = new UserWorld(new World("scene"));
    spawnTransportBelt(world, { x: 0, y: 0, variant: "angled-bottom-right" });
    const secondBeltId = spawnTransportBelt(world, { x: 20, y: 0, variant: "angled-left-bottom" });
    const thirdBeltId = spawnTransportBelt(world, { x: 20, y: 20, variant: "angled-top-left" });
    spawnTransportBelt(world, { x: 0, y: 20, variant: "angled-right-up" });

    expect([...world.query(TransportBeltLeaf, ConveyorBeltComponent)]).toEqual([thirdBeltId]);

    const adjacentBeltId = spawnTransportBelt(world, { x: -20, y: 0, variant: "horizontal-right" });
    TransportBeltAutoShapeManager.refreshAffectedBelts(world, adjacentBeltId);

    const leafBeltIds = [...world.query(TransportBeltLeaf, ConveyorBeltComponent)];

    expect(leafBeltIds).toHaveLength(2);
    expect(leafBeltIds).toContain(thirdBeltId);
    expect(leafBeltIds).toContain(adjacentBeltId);

    const sourceBeltId = world.require(thirdBeltId, ConveyorBeltComponent).previousEntityId;

    expect(sourceBeltId).toBe(secondBeltId);

    if (sourceBeltId === null) {
      throw new Error("Expected the loop leaf to retain its previous belt connection");
    }

    const entityId = world.create();
    const sourceBelt = world.require(sourceBeltId, ConveyorBeltComponent);
    const leafBelt = world.require(thirdBeltId, ConveyorBeltComponent);

    world.add(entityId, new Parent(sourceBeltId));
    world.add(entityId, new Transform2D());

    sourceBelt.left[3] = entityId;
    sourceBelt.leftProgress[3] = 1;

    ConveyorEntityMotionUtils.advanceBeltLineFromLeaf(world, thirdBeltId, 0);

    expect(sourceBelt.left).toEqual([null, null, null, null]);
    expect(leafBelt.left).toEqual([entityId, null, null, null]);
    expect(world.require(entityId, Parent).entityId).toBe(thirdBeltId);
    expect(world.require(adjacentBeltId, ConveyorBeltComponent).previousEntityId).toBeNull();
    expect(world.require(adjacentBeltId, ConveyorBeltComponent).nextEntityId).toBeNull();
  });

  it("keeps items moving after breaking a loop", () => {
    const world = new UserWorld(new World("scene"));
    const firstBeltId = spawnTransportBelt(world, { x: 0, y: 0, variant: "angled-bottom-right" });
    const secondBeltId = spawnTransportBelt(world, { x: 20, y: 0, variant: "angled-left-bottom" });
    const thirdBeltId = spawnTransportBelt(world, { x: 20, y: 20, variant: "angled-top-left" });
    const fourthBeltId = spawnTransportBelt(world, { x: 0, y: 20, variant: "angled-right-up" });

    destroyTransportBelt(world, firstBeltId);

    const leafBeltIds = [...world.query(TransportBeltLeaf, ConveyorBeltComponent)];

    expect(leafBeltIds).toEqual([fourthBeltId]);

    const entityId = world.create();
    const thirdBelt = world.require(thirdBeltId, ConveyorBeltComponent);
    const fourthBelt = world.require(fourthBeltId, ConveyorBeltComponent);

    world.add(entityId, new Parent(thirdBeltId));
    world.add(entityId, new Transform2D());

    thirdBelt.left[3] = entityId;
    thirdBelt.leftProgress[3] = 1;

    ConveyorEntityMotionUtils.advanceBeltLineFromLeaf(world, fourthBeltId, 0);

    expect(thirdBelt.left).toEqual([null, null, null, null]);
    expect(fourthBelt.left).toEqual([entityId, null, null, null]);
    expect(world.require(entityId, Parent).entityId).toBe(fourthBeltId);
    expect(world.has(secondBeltId, ConveyorBeltComponent)).toBe(true);
  });

  it("keeps the user's loop layout moving after adding an unrelated side belt and deleting from the loop", () => {
    const world = new UserWorld(new World("scene"));
    const centerBeltId = spawnTransportBelt(world, { x: 0, y: 0, variant: "vertical-up" });
    const topLeftBeltId = spawnTransportBelt(world, { x: 0, y: -20, variant: "angled-bottom-right" });
    const topRightBeltId = spawnTransportBelt(world, { x: 20, y: -20, variant: "angled-left-bottom" });
    const rightBeltId = spawnTransportBelt(world, { x: 20, y: 0, variant: "vertical-down" });
    const bottomRightBeltId = spawnTransportBelt(world, { x: 20, y: 20, variant: "angled-top-left" });
    const bottomLeftBeltId = spawnTransportBelt(world, { x: 0, y: 20, variant: "angled-right-up" });
    const sideBeltId = spawnTransportBelt(world, { x: -20, y: 0, variant: "horizontal-right" });

    TransportBeltAutoShapeManager.refreshAffectedBelts(world, sideBeltId);

    destroyTransportBelt(world, rightBeltId);
    TransportBeltAutoShapeManager.refreshBeltsNearCoordinates(
      world,
      GridSingleton.worldToGridCoordinates(20, 0),
    );

    const leafBeltIds = [...world.query(TransportBeltLeaf, ConveyorBeltComponent)];

    expect(leafBeltIds.length).toBeGreaterThan(0);

    const entityId = world.create();
    const sourceBelt = world.require(topLeftBeltId, ConveyorBeltComponent);
    const downstreamLeafBeltId = leafBeltIds.find((beltEntityId) => beltEntityId !== sideBeltId);

    if (downstreamLeafBeltId === undefined) {
      throw new Error("Expected the broken loop segment to keep a traversal leaf");
    }

    world.add(entityId, new Parent(topLeftBeltId));
    world.add(entityId, new Transform2D());

    sourceBelt.left[3] = entityId;
    sourceBelt.leftProgress[3] = 1;

    ConveyorEntityMotionUtils.advanceBeltLineFromLeaf(world, downstreamLeafBeltId, 0);

    expect(sourceBelt.left).toEqual([null, null, null, null]);
    expect(world.require(entityId, Parent).entityId).not.toBe(topLeftBeltId);
    expect(world.require(sideBeltId, ConveyorBeltComponent).previousEntityId).toBeNull();
    expect(world.require(sideBeltId, ConveyorBeltComponent).nextEntityId).toBeNull();
    expect(world.has(centerBeltId, ConveyorBeltComponent)).toBe(true);
    expect(world.has(topRightBeltId, ConveyorBeltComponent)).toBe(true);
    expect(world.has(bottomRightBeltId, ConveyorBeltComponent)).toBe(true);
    expect(world.has(bottomLeftBeltId, ConveyorBeltComponent)).toBe(true);
  });

  it("keeps multiple carried items advancing in the user's screenshot layout after the opposite belt is deleted", () => {
    const world = new UserWorld(new World("scene"));
    const centerBeltId = spawnTransportBelt(world, { x: 0, y: 0, variant: "vertical-up" });
    const topLeftBeltId = spawnTransportBelt(world, { x: 0, y: -20, variant: "angled-bottom-right" });
    const topRightBeltId = spawnTransportBelt(world, { x: 20, y: -20, variant: "angled-left-bottom" });
    const rightBeltId = spawnTransportBelt(world, { x: 20, y: 0, variant: "vertical-down" });
    spawnTransportBelt(world, { x: 20, y: 20, variant: "angled-top-left" });
    const bottomLeftBeltId = spawnTransportBelt(world, { x: 0, y: 20, variant: "angled-right-up" });
    const sideBeltId = spawnTransportBelt(world, { x: -20, y: 0, variant: "horizontal-right" });
    const topItemId = world.create();
    const sideItemId = world.create();
    const bottomItemId = world.create();

    ConveyorUtils.addEntity(world, topLeftBeltId, topItemId, "left", 2, 0);
    ConveyorUtils.addEntity(world, centerBeltId, sideItemId, "left", 1, 0);
    ConveyorUtils.addEntity(world, bottomLeftBeltId, bottomItemId, "left", 1, 0);

    TransportBeltAutoShapeManager.refreshAffectedBelts(world, sideBeltId);

    destroyTransportBelt(world, rightBeltId);
    TransportBeltAutoShapeManager.refreshBeltsNearCoordinates(
      world,
      GridSingleton.worldToGridCoordinates(20, 0),
    );

    ConveyorEntityMotionUtils.advanceBeltLineFromLeaf(
      world,
      topRightBeltId,
      SLOT_ADVANCE_DURATION_MS / CONVEYOR_SLOT_COUNT_PER_LANE,
    );

    expect(world.require(topItemId, Parent).entityId).toBe(topLeftBeltId);
    expect(world.require(sideItemId, Parent).entityId).toBe(centerBeltId);
    expect(world.require(bottomItemId, Parent).entityId).toBe(bottomLeftBeltId);

    const topLeftBelt = world.require(topLeftBeltId, ConveyorBeltComponent);
    const centerBelt = world.require(centerBeltId, ConveyorBeltComponent);
    const bottomLeftBelt = world.require(bottomLeftBeltId, ConveyorBeltComponent);

    expect(topLeftBelt.left[3]).toBe(topItemId);
    expect(centerBelt.left[2]).toBe(sideItemId);
    expect(bottomLeftBelt.left[2]).toBe(bottomItemId);
    expect(world.require(sideBeltId, ConveyorBeltComponent).previousEntityId).toBeNull();
    expect(world.require(sideBeltId, ConveyorBeltComponent).nextEntityId).toBeNull();
  });

  it("keeps already-moving items advancing in the larger loop after adding a side belt and deleting the opposite middle belt", () => {
    const world = new UserWorld(new World("scene"));
    const beltIds = {
      leftTop: spawnTransportBelt(world, { x: 0, y: -20, variant: "angled-bottom-right" }),
      leftUpper: spawnTransportBelt(world, { x: 0, y: 0, variant: "vertical-up" }),
      leftMid: spawnTransportBelt(world, { x: 0, y: 20, variant: "vertical-up" }),
      leftLower: spawnTransportBelt(world, { x: 0, y: 40, variant: "vertical-up" }),
      leftBottom: spawnTransportBelt(world, { x: 0, y: 60, variant: "angled-right-up" }),
      topInnerLeft: spawnTransportBelt(world, { x: 20, y: -20, variant: "horizontal-right" }),
      topInnerMid: spawnTransportBelt(world, { x: 40, y: -20, variant: "horizontal-right" }),
      topInnerRight: spawnTransportBelt(world, { x: 60, y: -20, variant: "horizontal-right" }),
      rightTop: spawnTransportBelt(world, { x: 80, y: -20, variant: "angled-left-bottom" }),
      rightMidUpper: spawnTransportBelt(world, { x: 80, y: 0, variant: "vertical-down" }),
      rightMid: spawnTransportBelt(world, { x: 80, y: 20, variant: "vertical-down" }),
      rightMidLower: spawnTransportBelt(world, { x: 80, y: 40, variant: "vertical-down" }),
      rightBottom: spawnTransportBelt(world, { x: 80, y: 60, variant: "angled-top-left" }),
      bottomInnerRight: spawnTransportBelt(world, { x: 60, y: 60, variant: "horizontal-left" }),
      bottomInnerMid: spawnTransportBelt(world, { x: 40, y: 60, variant: "horizontal-left" }),
      bottomInnerLeft: spawnTransportBelt(world, { x: 20, y: 60, variant: "horizontal-left" }),
    };
    const topItemId = world.create();
    const leftItemId = world.create();
    const bottomItemId = world.create();

    ConveyorUtils.addEntity(world, beltIds.topInnerMid, topItemId, "left", 1, 0.25);
    ConveyorUtils.addEntity(world, beltIds.leftMid, leftItemId, "left", 2, 0.5);
    ConveyorUtils.addEntity(world, beltIds.bottomInnerMid, bottomItemId, "left", 1, 0.75);

    const initialLeafBeltIds = [...world.query(TransportBeltLeaf, ConveyorBeltComponent)];

    expect(initialLeafBeltIds).toHaveLength(1);

    ConveyorEntityMotionUtils.advanceBeltLineFromLeaf(
      world,
      initialLeafBeltIds[0],
      SLOT_ADVANCE_DURATION_MS / CONVEYOR_SLOT_COUNT_PER_LANE,
    );

    const sideBeltId = spawnTransportBelt(world, { x: -20, y: 20, variant: "horizontal-right" });
    TransportBeltAutoShapeManager.refreshAffectedBelts(world, sideBeltId);
    destroyTransportBelt(world, beltIds.rightMid);
    TransportBeltAutoShapeManager.refreshBeltsNearCoordinates(
      world,
      GridSingleton.worldToGridCoordinates(80, 20),
    );

    const mainLeafBeltId = [...world.query(TransportBeltLeaf, ConveyorBeltComponent)]
      .find((beltEntityId) => beltEntityId !== sideBeltId);

    if (mainLeafBeltId === undefined) {
      throw new Error("Expected the main chain to keep a traversal leaf after deleting the opposite belt");
    }

    const parentBefore = {
      top: world.require(topItemId, Parent).entityId,
      left: world.require(leftItemId, Parent).entityId,
      bottom: world.require(bottomItemId, Parent).entityId,
    };

    ConveyorEntityMotionUtils.advanceBeltLineFromLeaf(
      world,
      mainLeafBeltId,
      SLOT_ADVANCE_DURATION_MS / CONVEYOR_SLOT_COUNT_PER_LANE,
    );

    const parentAfter = {
      top: world.require(topItemId, Parent).entityId,
      left: world.require(leftItemId, Parent).entityId,
      bottom: world.require(bottomItemId, Parent).entityId,
    };

    expect(parentAfter.top === parentBefore.top && parentAfter.left === parentBefore.left && parentAfter.bottom === parentBefore.bottom).toBe(false);
    expect(world.require(sideBeltId, ConveyorBeltComponent).previousEntityId).toBeNull();
    expect(world.require(sideBeltId, ConveyorBeltComponent).nextEntityId).toBeNull();
  });

  it("keeps already-moving items advancing when the opposite belt is deleted through placement", () => {
    const world = new UserWorld(new World("scene"));
    const beltIds = {
      leftTop: spawnTransportBelt(world, { x: 0, y: -20, variant: "angled-bottom-right" }),
      leftUpper: spawnTransportBelt(world, { x: 0, y: 0, variant: "vertical-up" }),
      leftMid: spawnTransportBelt(world, { x: 0, y: 20, variant: "vertical-up" }),
      leftLower: spawnTransportBelt(world, { x: 0, y: 40, variant: "vertical-up" }),
      leftBottom: spawnTransportBelt(world, { x: 0, y: 60, variant: "angled-right-up" }),
      topInnerLeft: spawnTransportBelt(world, { x: 20, y: -20, variant: "horizontal-right" }),
      topInnerMid: spawnTransportBelt(world, { x: 40, y: -20, variant: "horizontal-right" }),
      topInnerRight: spawnTransportBelt(world, { x: 60, y: -20, variant: "horizontal-right" }),
      rightTop: spawnTransportBelt(world, { x: 80, y: -20, variant: "angled-left-bottom" }),
      rightMidUpper: spawnTransportBelt(world, { x: 80, y: 0, variant: "vertical-down" }),
      rightMid: spawnTransportBelt(world, { x: 80, y: 20, variant: "vertical-down" }),
      rightMidLower: spawnTransportBelt(world, { x: 80, y: 40, variant: "vertical-down" }),
      rightBottom: spawnTransportBelt(world, { x: 80, y: 60, variant: "angled-top-left" }),
      bottomInnerRight: spawnTransportBelt(world, { x: 60, y: 60, variant: "horizontal-left" }),
      bottomInnerMid: spawnTransportBelt(world, { x: 40, y: 60, variant: "horizontal-left" }),
      bottomInnerLeft: spawnTransportBelt(world, { x: 20, y: 60, variant: "horizontal-left" }),
    };
    const topItemId = world.create();
    const leftItemId = world.create();

    ConveyorUtils.addEntity(world, beltIds.topInnerMid, topItemId, "left", 1, 0.25);
    ConveyorUtils.addEntity(world, beltIds.leftMid, leftItemId, "left", 2, 0.5);

    const [initialLeafBeltId] = [...world.query(TransportBeltLeaf, ConveyorBeltComponent)];

    ConveyorEntityMotionUtils.advanceBeltLineFromLeaf(
      world,
      initialLeafBeltId,
      SLOT_ADVANCE_DURATION_MS / CONVEYOR_SLOT_COUNT_PER_LANE,
    );

    const sideBeltId = spawnTransportBelt(world, { x: -20, y: 20, variant: "horizontal-right" });
    TransportBeltAutoShapeManager.refreshAffectedBelts(world, sideBeltId);

    PhysicsWorldManager.beginFrame([world]);
    Placement.deleteAt(world, { x: 80, y: 20 });

    const mainLeafBeltId = [...world.query(TransportBeltLeaf, ConveyorBeltComponent)]
      .find((beltEntityId) => beltEntityId !== sideBeltId);

    if (mainLeafBeltId === undefined) {
      throw new Error("Expected the main chain to keep a traversal leaf after placement deletion");
    }

    const topBefore = world.require(topItemId, Transform2D).curr.pos;
    const leftBefore = world.require(leftItemId, Transform2D).curr.pos;
    const topBeforeX = topBefore.x;
    const topBeforeY = topBefore.y;
    const leftBeforeX = leftBefore.x;
    const leftBeforeY = leftBefore.y;

    ConveyorEntityMotionUtils.advanceBeltLineFromLeaf(
      world,
      mainLeafBeltId,
      SLOT_ADVANCE_DURATION_MS / CONVEYOR_SLOT_COUNT_PER_LANE,
    );

    const topAfter = world.require(topItemId, Transform2D).curr.pos;
    const leftAfter = world.require(leftItemId, Transform2D).curr.pos;

    const didTopMove = topAfter.x !== topBeforeX || topAfter.y !== topBeforeY;
    const didLeftMove = leftAfter.x !== leftBeforeX || leftAfter.y !== leftBeforeY;

    expect(didTopMove || didLeftMove).toBe(true);
    expect(world.has(beltIds.rightMid, ConveyorBeltComponent)).toBe(false);
  });

  it("keeps a traversal leaf on the user's loop layout regardless of which loop belt is deleted", () => {
    const removalVariants = [
      "center",
      "top-left",
      "top-right",
      "right",
      "bottom-right",
      "bottom-left",
    ] as const;

    for (const removedBelt of removalVariants) {
      const world = new UserWorld(new World("scene"));
      const beltIds = {
        center: spawnTransportBelt(world, { x: 0, y: 0, variant: "vertical-up" }),
        "top-left": spawnTransportBelt(world, { x: 0, y: -20, variant: "angled-bottom-right" }),
        "top-right": spawnTransportBelt(world, { x: 20, y: -20, variant: "angled-left-bottom" }),
        right: spawnTransportBelt(world, { x: 20, y: 0, variant: "vertical-down" }),
        "bottom-right": spawnTransportBelt(world, { x: 20, y: 20, variant: "angled-top-left" }),
        "bottom-left": spawnTransportBelt(world, { x: 0, y: 20, variant: "angled-right-up" }),
      };
      const sideBeltId = spawnTransportBelt(world, { x: -20, y: 0, variant: "horizontal-right" });

      TransportBeltAutoShapeManager.refreshAffectedBelts(world, sideBeltId);

      destroyTransportBelt(world, beltIds[removedBelt]);
      const removedTransform = {
        center: [0, 0],
        "top-left": [0, -20],
        "top-right": [20, -20],
        right: [20, 0],
        "bottom-right": [20, 20],
        "bottom-left": [0, 20],
      } as const;

      const [removedX, removedY] = removedTransform[removedBelt];

      TransportBeltAutoShapeManager.refreshBeltsNearCoordinates(
        world,
        GridSingleton.worldToGridCoordinates(removedX, removedY),
      );

      const loopLeafBeltIds = [...world.query(TransportBeltLeaf, ConveyorBeltComponent)]
        .filter((beltEntityId) => beltEntityId !== sideBeltId);

      expect(loopLeafBeltIds.length, removedBelt).toBeGreaterThan(0);
    }
  });
});

describe("ConveyorWorldMotionUtils.advanceWorld", () => {
  it("side-loads both source lanes into the faced target lane after normal belt motion and syncs transforms", () => {
    const world = new UserWorld(new World("scene"));
    spawnTransportBelt(world, { x: 0, y: -20, variant: "vertical-down" });
    const middleBeltId = spawnTransportBelt(world, { x: 0, y: 0, variant: "vertical-down" });
    spawnTransportBelt(world, { x: 0, y: 20, variant: "vertical-down" });
    const sideBeltId = spawnTransportBelt(world, { x: -20, y: 0, variant: "horizontal-right" });
    const leftSideItemId = world.create();
    const rightSideItemId = world.create();

    ConveyorUtils.addEntity(world, sideBeltId, leftSideItemId, "left", 3, 1);
    ConveyorUtils.addEntity(world, sideBeltId, rightSideItemId, "right", 3, 1);

    ConveyorEntityMotionUtils.advanceWorld(world, SLOT_ADVANCE_DURATION_MS / CONVEYOR_SLOT_COUNT_PER_LANE);

    const middleBelt = world.require(middleBeltId, ConveyorBeltComponent);
    const sideBelt = world.require(sideBeltId, ConveyorBeltComponent);

    expect(middleBelt.right).toEqual([null, leftSideItemId, rightSideItemId, null]);
    expect(middleBelt.rightProgress).toEqual([0, 0, 0, 0]);
    expect(sideBelt.left).toEqual([null, null, null, null]);
    expect(sideBelt.right).toEqual([null, null, null, null]);
    expect(world.require(leftSideItemId, Parent).entityId).toBe(middleBeltId);
    expect(world.require(rightSideItemId, Parent).entityId).toBe(middleBeltId);

    expect(resolveWorldTransform2D(world, leftSideItemId, SHARED_WORLD_TRANSFORM)).toBe(true);
    expect(SHARED_WORLD_TRANSFORM.curr.pos.x).toBe(-4);
    expect(SHARED_WORLD_TRANSFORM.curr.pos.y).toBe(-5);
    expect(resolveWorldTransform2D(world, rightSideItemId, SHARED_WORLD_TRANSFORM)).toBe(true);
    expect(SHARED_WORLD_TRANSFORM.curr.pos.x).toBe(-4);
    expect(SHARED_WORLD_TRANSFORM.curr.pos.y).toBe(0);
  });

  it("waits until the target belt has already advanced before inserting side-loaded items", () => {
    const world = new UserWorld(new World("scene"));
    const topBeltId = spawnTransportBelt(world, { x: 0, y: -20, variant: "vertical-down" });
    const middleBeltId = spawnTransportBelt(world, { x: 0, y: 0, variant: "vertical-down" });
    spawnTransportBelt(world, { x: 0, y: 20, variant: "vertical-down" });
    const sideBeltId = spawnTransportBelt(world, { x: -20, y: 0, variant: "horizontal-right" });
    const existingTargetItemId = world.create();
    const transferredItemId = world.create();
    const blockedItemId = world.create();

    ConveyorUtils.addEntity(world, middleBeltId, existingTargetItemId, "right", 1, 1);
    ConveyorUtils.addEntity(world, sideBeltId, transferredItemId, "left", 3, 1);
    ConveyorUtils.addEntity(world, sideBeltId, blockedItemId, "right", 3, 1);

    ConveyorEntityMotionUtils.advanceWorld(world, SLOT_ADVANCE_DURATION_MS / CONVEYOR_SLOT_COUNT_PER_LANE);

    const topBelt = world.require(topBeltId, ConveyorBeltComponent);
    const middleBelt = world.require(middleBeltId, ConveyorBeltComponent);
    const sideBelt = world.require(sideBeltId, ConveyorBeltComponent);

    expect(topBelt.right[0]).toBeNull();
    expect(middleBelt.right).toEqual([null, transferredItemId, existingTargetItemId, null]);
    expect(sideBelt.left).toEqual([null, null, null, null]);
    expect(sideBelt.right[3]).toBe(blockedItemId);
    expect(world.require(transferredItemId, Parent).entityId).toBe(middleBeltId);
    expect(world.require(blockedItemId, Parent).entityId).toBe(sideBeltId);

    expect(resolveWorldTransform2D(world, transferredItemId, SHARED_WORLD_TRANSFORM)).toBe(true);
    expect(SHARED_WORLD_TRANSFORM.curr.pos.x).toBe(-4);
    expect(SHARED_WORLD_TRANSFORM.curr.pos.y).toBe(-5);
    expect(resolveWorldTransform2D(world, blockedItemId, SHARED_WORLD_TRANSFORM)).toBe(true);
    expect(SHARED_WORLD_TRANSFORM.curr.pos.x).toBe(-10);
    expect(SHARED_WORLD_TRANSFORM.curr.pos.y).toBe(4);
  });

  it("places an east side-loader onto the target belt's left lane when the target flows downward", () => {
    const world = new UserWorld(new World("scene"));
    spawnTransportBelt(world, { x: 0, y: -20, variant: "vertical-down" });
    const middleBeltId = spawnTransportBelt(world, { x: 0, y: 0, variant: "vertical-down" });
    spawnTransportBelt(world, { x: 0, y: 20, variant: "vertical-down" });
    const sideBeltId = spawnTransportBelt(world, { x: 20, y: 0, variant: "horizontal-left" });
    const sideItemId = world.create();

    ConveyorUtils.addEntity(world, sideBeltId, sideItemId, "left", 3, 1);

    ConveyorEntityMotionUtils.advanceWorld(world, SLOT_ADVANCE_DURATION_MS / CONVEYOR_SLOT_COUNT_PER_LANE);

    const middleBelt = world.require(middleBeltId, ConveyorBeltComponent);

    expect(middleBelt.left).toEqual([null, sideItemId, null, null]);
    expect(middleBelt.right).toEqual([null, null, null, null]);
    expect(world.require(sideItemId, Parent).entityId).toBe(middleBeltId);
    expect(resolveWorldTransform2D(world, sideItemId, SHARED_WORLD_TRANSFORM)).toBe(true);
    expect(SHARED_WORLD_TRANSFORM.curr.pos.x).toBe(4);
    expect(SHARED_WORLD_TRANSFORM.curr.pos.y).toBe(-5);
  });
});

describe("conveyor motion timing constants", () => {
  it("returns null lane roles for non-curved belts", () => {
    expect(getCurveLaneSides("horizontal-right")).toEqual([null, null]);
  });

  it("marks the correct inside lane for curved belts", () => {
    expect(getCurveLaneSides("angled-right-up")).toEqual(["right", "left"]);
    expect(getCurveLaneSides("angled-left-up")).toEqual(["left", "right"]);
  });

  it("uses a faster advance duration only for the inside curved lane", () => {
    expect(getSlotAdvanceDurations("horizontal-right")).toEqual([
      SLOT_ADVANCE_DURATION_MS,
      SLOT_ADVANCE_DURATION_MS,
    ]);
    expect(getSlotAdvanceDurations("angled-right-up")).toEqual([
      SLOT_ADVANCE_DURATION_MS,
      INSIDE_CURVE_SLOT_ADVANCE_DURATION_MS,
    ]);
    expect(getSlotAdvanceDurations("angled-left-up")).toEqual([
      INSIDE_CURVE_SLOT_ADVANCE_DURATION_MS,
      SLOT_ADVANCE_DURATION_MS,
    ]);
  });

  it("keeps the inside curved duration aligned with the configured speed multiplier", () => {
    expect(INSIDE_CURVE_SLOT_ADVANCE_DURATION_MS).toBe(
      SLOT_ADVANCE_DURATION_MS / INSIDE_CURVE_SPEED_MULTIPLIER,
    );
  });
});
