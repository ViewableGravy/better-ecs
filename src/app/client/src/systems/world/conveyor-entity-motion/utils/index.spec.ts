import { ConveyorBeltComponent } from "@client/components/conveyor-belt";
import { TransportBeltLeaf } from "@client/components/transport-belt-leaf";
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
});
