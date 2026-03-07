import { ConveyorBeltComponent } from "@client/components/conveyor-belt";
import { TransportBeltLeaf } from "@client/components/transport-belt-leaf";
import { destroyTransportBelt, spawnTransportBelt } from "@client/entities/transport-belt";
import { EntityId, UserWorld, World } from "@engine";
import { Parent, Transform2D } from "@engine/components";
import { describe, expect, it } from "vitest";

function countLeafBelts(world: UserWorld, beltEntityIds: readonly EntityId[]): number {
  return beltEntityIds.filter((beltEntityId) => world.has(beltEntityId, TransportBeltLeaf)).length;
}

describe("spawnTransportBelt connectivity", () => {
  it("connects adjacent straight belts and marks the tail as a leaf", () => {
    const world = new UserWorld(new World("scene"));
    const firstBeltId = spawnTransportBelt(world, { x: 0, y: 0, variant: "horizontal-right" });
    const secondBeltId = spawnTransportBelt(world, { x: 20, y: 0, variant: "horizontal-right" });

    const firstBelt = world.require(firstBeltId, ConveyorBeltComponent);
    const secondBelt = world.require(secondBeltId, ConveyorBeltComponent);

    expect(firstBelt.previousEntityId).toBeNull();
    expect(firstBelt.nextEntityId).toBe(secondBeltId);
    expect(secondBelt.previousEntityId).toBe(firstBeltId);
    expect(secondBelt.nextEntityId).toBeNull();
    expect(firstBelt.isLeaf).toBe(false);
    expect(secondBelt.isLeaf).toBe(true);
    expect(world.has(firstBeltId, TransportBeltLeaf)).toBe(false);
    expect(world.has(secondBeltId, TransportBeltLeaf)).toBe(true);
  });

  it("connects a straight belt into a compatible curve", () => {
    const world = new UserWorld(new World("scene"));
    const straightBeltId = spawnTransportBelt(world, { x: 0, y: 0, variant: "horizontal-right" });
    const curveBeltId = spawnTransportBelt(world, { x: 20, y: 0, variant: "angled-left-up" });

    const straightBelt = world.require(straightBeltId, ConveyorBeltComponent);
    const curveBelt = world.require(curveBeltId, ConveyorBeltComponent);

    expect(straightBelt.nextEntityId).toBe(curveBeltId);
    expect(curveBelt.previousEntityId).toBe(straightBeltId);
    expect(curveBelt.isLeaf).toBe(true);
    expect(world.has(curveBeltId, TransportBeltLeaf)).toBe(true);
  });

  it("connects a curve into a compatible straight belt", () => {
    const world = new UserWorld(new World("scene"));
    const curveBeltId = spawnTransportBelt(world, { x: 20, y: 0, variant: "angled-left-up" });
    const straightBeltId = spawnTransportBelt(world, { x: 20, y: -20, variant: "vertical-up" });

    const curveBelt = world.require(curveBeltId, ConveyorBeltComponent);
    const straightBelt = world.require(straightBeltId, ConveyorBeltComponent);

    expect(curveBelt.nextEntityId).toBe(straightBeltId);
    expect(straightBelt.previousEntityId).toBe(curveBeltId);
    expect(straightBelt.isLeaf).toBe(true);
    expect(world.has(straightBeltId, TransportBeltLeaf)).toBe(true);
  });

  it("preserves a single designated leaf anchor when a new belt closes a loop", () => {
    const world = new UserWorld(new World("scene"));
    const firstBeltId = spawnTransportBelt(world, { x: 0, y: 0, variant: "angled-bottom-right" });
    const secondBeltId = spawnTransportBelt(world, { x: 20, y: 0, variant: "angled-left-bottom" });
    const thirdBeltId = spawnTransportBelt(world, { x: 20, y: 20, variant: "angled-top-left" });
    const fourthBeltId = spawnTransportBelt(world, { x: 0, y: 20, variant: "angled-right-up" });

    const firstBelt = world.require(firstBeltId, ConveyorBeltComponent);
    const secondBelt = world.require(secondBeltId, ConveyorBeltComponent);
    const thirdBelt = world.require(thirdBeltId, ConveyorBeltComponent);
    const fourthBelt = world.require(fourthBeltId, ConveyorBeltComponent);

    expect(firstBelt.previousEntityId).toBe(fourthBeltId);
    expect(firstBelt.nextEntityId).toBe(secondBeltId);
    expect(secondBelt.previousEntityId).toBe(firstBeltId);
    expect(secondBelt.nextEntityId).toBe(thirdBeltId);
    expect(thirdBelt.previousEntityId).toBe(secondBeltId);
    expect(thirdBelt.nextEntityId).toBe(fourthBeltId);
    expect(fourthBelt.previousEntityId).toBe(thirdBeltId);
    expect(fourthBelt.nextEntityId).toBe(firstBeltId);
    expect(thirdBelt.isLeaf).toBe(true);
    expect(world.has(thirdBeltId, TransportBeltLeaf)).toBe(true);
    expect(firstBelt.isLeaf).toBe(false);
    expect(secondBelt.isLeaf).toBe(false);
    expect(fourthBelt.isLeaf).toBe(false);
    expect(world.has(firstBeltId, TransportBeltLeaf)).toBe(false);
    expect(world.has(secondBeltId, TransportBeltLeaf)).toBe(false);
    expect(world.has(fourthBeltId, TransportBeltLeaf)).toBe(false);
    expect(countLeafBelts(world, [firstBeltId, secondBeltId, thirdBeltId, fourthBeltId])).toBe(1);
  });

  it("rewires an inserted middle belt into the existing line", () => {
    const world = new UserWorld(new World("scene"));
    const firstBeltId = spawnTransportBelt(world, { x: 0, y: 0, variant: "horizontal-right" });
    const thirdBeltId = spawnTransportBelt(world, { x: 40, y: 0, variant: "horizontal-right" });
    const secondBeltId = spawnTransportBelt(world, { x: 20, y: 0, variant: "horizontal-right" });

    const firstBelt = world.require(firstBeltId, ConveyorBeltComponent);
    const secondBelt = world.require(secondBeltId, ConveyorBeltComponent);
    const thirdBelt = world.require(thirdBeltId, ConveyorBeltComponent);

    expect(firstBelt.nextEntityId).toBe(secondBeltId);
    expect(secondBelt.previousEntityId).toBe(firstBeltId);
    expect(secondBelt.nextEntityId).toBe(thirdBeltId);
    expect(thirdBelt.previousEntityId).toBe(secondBeltId);
    expect(firstBelt.isLeaf).toBe(false);
    expect(secondBelt.isLeaf).toBe(false);
    expect(thirdBelt.isLeaf).toBe(true);
    expect(world.has(firstBeltId, TransportBeltLeaf)).toBe(false);
    expect(world.has(secondBeltId, TransportBeltLeaf)).toBe(false);
    expect(world.has(thirdBeltId, TransportBeltLeaf)).toBe(true);
    expect(countLeafBelts(world, [firstBeltId, secondBeltId, thirdBeltId])).toBe(1);
  });

  it("does not connect belts that are adjacent but flowing the opposite direction", () => {
    const world = new UserWorld(new World("scene"));
    const leftBeltId = spawnTransportBelt(world, { x: 0, y: 0, variant: "horizontal-left" });
    const rightBeltId = spawnTransportBelt(world, { x: 20, y: 0, variant: "horizontal-right" });

    const leftBelt = world.require(leftBeltId, ConveyorBeltComponent);
    const rightBelt = world.require(rightBeltId, ConveyorBeltComponent);

    expect(leftBelt.previousEntityId).toBeNull();
    expect(leftBelt.nextEntityId).toBeNull();
    expect(rightBelt.previousEntityId).toBeNull();
    expect(rightBelt.nextEntityId).toBeNull();
    expect(world.has(leftBeltId, TransportBeltLeaf)).toBe(true);
    expect(world.has(rightBeltId, TransportBeltLeaf)).toBe(true);
  });

  it("does not connect tangential belts", () => {
    const world = new UserWorld(new World("scene"));
    const verticalBeltId = spawnTransportBelt(world, { x: 0, y: 0, variant: "vertical-up" });
    const horizontalBeltId = spawnTransportBelt(world, { x: 20, y: 0, variant: "horizontal-right" });

    const verticalBelt = world.require(verticalBeltId, ConveyorBeltComponent);
    const horizontalBelt = world.require(horizontalBeltId, ConveyorBeltComponent);

    expect(verticalBelt.previousEntityId).toBeNull();
    expect(verticalBelt.nextEntityId).toBeNull();
    expect(horizontalBelt.previousEntityId).toBeNull();
    expect(horizontalBelt.nextEntityId).toBeNull();
  });

  it("does not connect a curve whose entry side does not face the current belt", () => {
    const world = new UserWorld(new World("scene"));
    const straightBeltId = spawnTransportBelt(world, { x: 0, y: 0, variant: "horizontal-right" });
    const wrongCurveBeltId = spawnTransportBelt(world, { x: 20, y: 0, variant: "angled-right-up" });

    const straightBelt = world.require(straightBeltId, ConveyorBeltComponent);
    const wrongCurveBelt = world.require(wrongCurveBeltId, ConveyorBeltComponent);

    expect(straightBelt.nextEntityId).toBeNull();
    expect(wrongCurveBelt.previousEntityId).toBeNull();
  });
});

describe("destroyTransportBelt", () => {
  it("breaks the line at the removed belt and destroys child items with it", () => {
    const world = new UserWorld(new World("scene"));
    const firstBeltId = spawnTransportBelt(world, { x: 0, y: 0, variant: "horizontal-right" });
    const middleBeltId = spawnTransportBelt(world, { x: 20, y: 0, variant: "horizontal-right" });
    const tailBeltId = spawnTransportBelt(world, { x: 40, y: 0, variant: "horizontal-right" });
    const carriedItemId = world.create();

    world.add(carriedItemId, new Parent(middleBeltId));
    world.add(carriedItemId, new Transform2D());

    destroyTransportBelt(world, middleBeltId);

    const firstBelt = world.require(firstBeltId, ConveyorBeltComponent);
    const tailBelt = world.require(tailBeltId, ConveyorBeltComponent);

    expect(firstBelt.nextEntityId).toBeNull();
    expect(tailBelt.previousEntityId).toBeNull();
    expect(firstBelt.isLeaf).toBe(true);
    expect(tailBelt.isLeaf).toBe(true);
    expect(world.has(firstBeltId, TransportBeltLeaf)).toBe(true);
    expect(world.has(tailBeltId, TransportBeltLeaf)).toBe(true);
    expect(world.all().includes(middleBeltId)).toBe(false);
    expect(world.all().includes(carriedItemId)).toBe(false);
  });
});
