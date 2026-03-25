import { ConveyorBeltComponent } from "@client/components/conveyor-belt";
import { spawnTransportBelt } from "@client/entities/transport-belt";
import { ConveyorUtils } from "@client/entities/transport-belt/ConveyorUtils";
import { UserWorld, World } from "@engine";
import { Parent, Transform2D } from "@engine/components";
import { describe, expect, it } from "vitest";

describe("ConveyorUtils.addEntity", () => {
  it("places a carried item onto the requested belt slot and parents it to the conveyor", () => {
    const world = new UserWorld(new World("scene"));
    const beltEntityId = spawnTransportBelt(world, { x: 0, y: 0, connectToNeighbors: false });
    const entityId = world.create();

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

  it("serializes carried-item lane progress so refresh can resume belt motion correctly", () => {
    const world = new UserWorld(new World("scene"));
    const beltEntityId = spawnTransportBelt(world, { x: 0, y: 0, connectToNeighbors: false });
    const entityId = world.create();

    ConveyorUtils.addEntity(world, beltEntityId, entityId, "left", 2, 0.75);

    const serializedBelt = world.serialize().entities
      .find((entity) => entity.entityId === beltEntityId)
      ?.components.find((component) => component.type === "ConveyorBeltComponent");

    expect(serializedBelt?.type).toBe("ConveyorBeltComponent");
    expect(serializedBelt?.data).toEqual(expect.objectContaining({
        left: [null, null, entityId, null],
        leftProgress: [0, 0, 0.75, 0],
        rightProgress: [0, 0, 0, 0],
    }));
  });
});
