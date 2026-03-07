import { ConveyorBeltComponent } from "@client/components/conveyor-belt";
import { ConveyorUtils } from "@client/entities/transport-belt/utils/general";
import { UserWorld, World } from "@engine";
import { Parent, Transform2D } from "@engine/components";
import { describe, expect, it } from "vitest";

describe("ConveyorUtils.addEntity", () => {
  it("places a carried item onto the requested belt slot and parents it to the conveyor", () => {
    const world = new UserWorld(new World("scene"));
    const beltEntityId = world.create();
    const entityId = world.create();

    world.add(beltEntityId, new ConveyorBeltComponent("horizontal-right"));

    ConveyorUtils.addEntity(world, beltEntityId, entityId, "left", 0, 0.5);

    const belt = world.require(beltEntityId, ConveyorBeltComponent);
    const parent = world.require(entityId, Parent);
    const transform = world.require(entityId, Transform2D);

    expect(parent.entityId).toBe(beltEntityId);
    expect(belt.left[0]).toBe(entityId);
    expect(belt.leftProgress[0]).toBe(0.5);
    expect(transform.curr.pos.x).toBe(-7.5);
    expect(transform.curr.pos.y).toBe(-4);
  });
});
