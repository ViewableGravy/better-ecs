import { ConveyorBeltComponent } from "@client/components/conveyor-belt";
import { TransportBeltLeaf } from "@client/components/transport-belt-leaf";
import {
  CONVEYOR_SLOT_COUNT_PER_LANE,
  getCurveLaneSides,
  getSlotAdvanceDurations,
  INSIDE_CURVE_SLOT_ADVANCE_DURATION_MS,
  SLOT_ADVANCE_DURATION_MS,
} from "@client/systems/world/conveyor-entity-motion/constants";
import { ConveyorEntityMotionUtils } from "@client/systems/world/conveyor-entity-motion/utils";
import { UserWorld, World } from "@engine";
import { Parent, Transform2D } from "@engine/components";
import { resolveWorldTransform2D } from "@engine/ecs/hierarchy";
import { describe, expect, it } from "vitest";

const SHARED_WORLD_TRANSFORM = new Transform2D();

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

  it("keeps the inside curved duration at 120 percent speed", () => {
    expect(INSIDE_CURVE_SLOT_ADVANCE_DURATION_MS).toBe(SLOT_ADVANCE_DURATION_MS / 1.2);
  });
});
