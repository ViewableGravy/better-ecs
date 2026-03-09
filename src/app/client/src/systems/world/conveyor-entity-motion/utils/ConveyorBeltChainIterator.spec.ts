import { ConveyorBeltComponent } from "@client/components/conveyor-belt";
import { UserWorld, World } from "@engine";
import { describe, expect, it } from "vitest";
import { ConveyorBeltChainIterator } from "./ConveyorBeltChainIterator";

describe("ConveyorBeltChainIterator", () => {
  it("iterates an open chain from the leaf back toward the head and can be reset", () => {
    const world = new UserWorld(new World("scene"));
    const headBeltId = world.create();
    const middleBeltId = world.create();
    const leafBeltId = world.create();
    const headBelt = new ConveyorBeltComponent("horizontal-right");
    const middleBelt = new ConveyorBeltComponent("horizontal-right");
    const leafBelt = new ConveyorBeltComponent("horizontal-right");
    const iterator = new ConveyorBeltChainIterator();

    headBelt.nextEntityId = middleBeltId;
    middleBelt.previousEntityId = headBeltId;
    middleBelt.nextEntityId = leafBeltId;
    leafBelt.previousEntityId = middleBeltId;

    world.add(headBeltId, headBelt);
    world.add(middleBeltId, middleBelt);
    world.add(leafBeltId, leafBelt);

    iterator.setLeaf(world, leafBeltId);

    expect(iterator.getInitialNextEntityId()).toBeNull();
    expect([...iterator.iterate()]).toEqual([leafBeltId, middleBeltId, headBeltId]);
    expect([...iterator.iterate()]).toEqual([leafBeltId, middleBeltId, headBeltId]);
  });

  it("keeps the designated downstream belt for closed loops and stops after one full traversal", () => {
    const world = new UserWorld(new World("scene"));
    const anchorBeltId = world.create();
    const secondBeltId = world.create();
    const thirdBeltId = world.create();
    const anchorBelt = new ConveyorBeltComponent("horizontal-right");
    const secondBelt = new ConveyorBeltComponent("horizontal-right");
    const thirdBelt = new ConveyorBeltComponent("horizontal-right");
    const iterator = new ConveyorBeltChainIterator();

    anchorBelt.previousEntityId = thirdBeltId;
    anchorBelt.nextEntityId = secondBeltId;
    secondBelt.previousEntityId = anchorBeltId;
    secondBelt.nextEntityId = thirdBeltId;
    thirdBelt.previousEntityId = secondBeltId;
    thirdBelt.nextEntityId = anchorBeltId;

    world.add(anchorBeltId, anchorBelt);
    world.add(secondBeltId, secondBelt);
    world.add(thirdBeltId, thirdBelt);

    iterator.setLeaf(world, anchorBeltId);

    expect(iterator.getInitialNextEntityId()).toBe(secondBeltId);
    expect([...iterator.iterate()]).toEqual([anchorBeltId, thirdBeltId, secondBeltId]);
  });
});