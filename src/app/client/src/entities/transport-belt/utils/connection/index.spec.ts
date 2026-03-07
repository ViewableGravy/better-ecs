import { ConveyorBeltComponent } from "@client/components/conveyor-belt";
import { TransportBeltLeaf } from "@client/components/transport-belt-leaf";
import { destroyTransportBelt, spawnTransportBelt } from "@client/entities/transport-belt";
import { Parent, Transform2D } from "@engine/components";
import { UserWorld, World } from "@engine";
import { describe, expect, it } from "vitest";

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
    expect(world.has(firstBeltId, TransportBeltLeaf)).toBe(false);
    expect(world.has(secondBeltId, TransportBeltLeaf)).toBe(true);
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
    expect(world.has(thirdBeltId, TransportBeltLeaf)).toBe(true);
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
    expect(world.has(firstBeltId, TransportBeltLeaf)).toBe(true);
    expect(world.has(tailBeltId, TransportBeltLeaf)).toBe(true);
    expect(world.all().includes(middleBeltId)).toBe(false);
    expect(world.all().includes(carriedItemId)).toBe(false);
  });
});
