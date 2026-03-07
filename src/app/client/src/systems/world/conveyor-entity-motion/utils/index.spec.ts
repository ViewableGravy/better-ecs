import { ConveyorBeltComponent } from "@client/components/conveyor-belt";
import { ConveyorUtils } from "@client/entities/transport-belt/conveyor-utils";
import { ConveyorEntityMotionUtils } from "@client/systems/world/conveyor-entity-motion/utils";
import { UserWorld, Vec2, World } from "@engine";
import { Transform2D } from "@engine/components";
import { describe, expect, it } from "vitest";

describe("ConveyorUtils.resolveAnimatedSlotLocalPositionInto", () => {
  it("uses the configured half-step span between adjacent straight-belt slots", () => {
    const out = new Vec2();

    ConveyorUtils.resolveAnimatedSlotLocalPositionInto("horizontal-right", "left", 0, 0, out);
    expect(out.x).toBe(-10);
    expect(out.y).toBe(-4);

    ConveyorUtils.resolveAnimatedSlotLocalPositionInto("horizontal-right", "left", 0, 1, out);
    expect(out.x).toBe(-5);
    expect(out.y).toBe(-4);

    ConveyorUtils.resolveAnimatedSlotLocalPositionInto("horizontal-right", "left", 1, 0, out);
    expect(out.x).toBe(-5);
    expect(out.y).toBe(-4);

    ConveyorUtils.resolveAnimatedSlotLocalPositionInto("horizontal-right", "left", 1, 1, out);
    expect(out.x).toBe(0);
    expect(out.y).toBe(-4);
  });
});

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

    ConveyorEntityMotionUtils.advanceConveyor(world, conveyor, 0);

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

    ConveyorEntityMotionUtils.advanceConveyor(world, conveyor, 0);

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

    ConveyorEntityMotionUtils.advanceConveyor(world, conveyor, 0);

    expect(conveyor.left).toEqual([null, left0EntityId, left1EntityId, left2EntityId]);
    expect(conveyor.right).toEqual([null, right0EntityId, null, null]);
    expect(conveyor.leftProgress).toEqual([0, 0, 0, 0]);
    expect(conveyor.rightProgress).toEqual([0, 0, 0, 0]);
  });

  it("wraps the final slot back to the first slot for the demo loop", () => {
    const world = new UserWorld(new World("scene"));
    const conveyorEntityId = world.create();
    const conveyor = new ConveyorBeltComponent("horizontal-right");
    const entityId = world.create();

    world.add(conveyorEntityId, conveyor);
    world.add(entityId, new Transform2D());

    conveyor.right[3] = entityId;
    conveyor.rightProgress[3] = 1;

    ConveyorEntityMotionUtils.advanceConveyor(world, conveyor, 0);

    expect(conveyor.right).toEqual([entityId, null, null, null]);
    expect(conveyor.rightProgress).toEqual([0, 0, 0, 0]);

    const transform = world.require(entityId, Transform2D);

    expect(transform.curr.pos.x).toBe(-10);
    expect(transform.curr.pos.y).toBe(4);
  });
});
