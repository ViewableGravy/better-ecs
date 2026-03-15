import { ConveyorBeltComponent } from "@client/components/conveyor-belt";
import { destroyTransportBelt, spawnTransportBelt } from "@client/entities/transport-belt";
import { TransportBeltAutoShapeManager } from "@client/entities/transport-belt/placement/TransportBeltAutoShapeManager";
import { GridSingleton } from "@client/systems/world/build-mode/grid-singleton";
import { UserWorld, World } from "@engine";
import { describe, expect, it } from "vitest";

describe("TransportBeltAutoShapeManager", () => {
  it("bends a belt when exactly one side neighbor uniquely feeds its start", () => {
    const world = new UserWorld(new World("scene"));

    spawnTransportBelt(world, { x: 10, y: 10, variant: "horizontal-left" });
    spawnTransportBelt(world, { x: 30, y: 10, variant: "angled-top-left" });
    const middleBeltId = spawnTransportBelt(world, { x: 30, y: 30, variant: "vertical-down" });
    const placedBeltId = spawnTransportBelt(world, { x: 50, y: 30, variant: "horizontal-left" });

    TransportBeltAutoShapeManager.refreshAffectedBelts(world, placedBeltId);

    expect(world.require(middleBeltId, ConveyorBeltComponent).variant).toBe("angled-right-bottom");
  });

  it("keeps the original straight direction when two side inputs compete", () => {
    const world = new UserWorld(new World("scene"));

    spawnTransportBelt(world, { x: 10, y: 10, variant: "horizontal-left" });
    spawnTransportBelt(world, { x: 30, y: 10, variant: "angled-top-left" });
    const middleBeltId = spawnTransportBelt(world, { x: 30, y: 30, variant: "vertical-down" });
    spawnTransportBelt(world, { x: 10, y: 30, variant: "horizontal-right" });
    const placedBeltId = spawnTransportBelt(world, { x: 50, y: 30, variant: "horizontal-left" });

    TransportBeltAutoShapeManager.refreshAffectedBelts(world, placedBeltId);

    expect(world.require(middleBeltId, ConveyorBeltComponent).variant).toBe("vertical-down");
  });

  it("prefers staying straight when the original tail already has an incoming belt", () => {
    const world = new UserWorld(new World("scene"));

    spawnTransportBelt(world, { x: 10, y: -10, variant: "vertical-down" });
    const middleBeltId = spawnTransportBelt(world, { x: 10, y: 10, variant: "vertical-down" });
    spawnTransportBelt(world, { x: 10, y: 30, variant: "vertical-down" });
    const placedBeltId = spawnTransportBelt(world, { x: 30, y: 10, variant: "horizontal-left" });

    TransportBeltAutoShapeManager.refreshAffectedBelts(world, placedBeltId);

    expect(world.require(middleBeltId, ConveyorBeltComponent).variant).toBe("vertical-down");
  });

  it("keeps a horizontal line straight when a side feeder faces its middle belt", () => {
    const world = new UserWorld(new World("scene"));

    spawnTransportBelt(world, { x: -10, y: 10, variant: "horizontal-right" });
    const middleBeltId = spawnTransportBelt(world, { x: 10, y: 10, variant: "horizontal-right" });
    spawnTransportBelt(world, { x: 30, y: 10, variant: "horizontal-right" });
    const placedBeltId = spawnTransportBelt(world, { x: 10, y: 30, variant: "vertical-up" });

    TransportBeltAutoShapeManager.refreshAffectedBelts(world, placedBeltId);

    expect(world.require(middleBeltId, ConveyorBeltComponent).variant).toBe("horizontal-right");
  });

  it("returns a vertical line to straight after the upstream belt is removed and re-added beside a side feeder", () => {
    const world = new UserWorld(new World("scene"));

    const upperBeltId = spawnTransportBelt(world, { x: 10, y: -10, variant: "vertical-down" });
    const middleBeltId = spawnTransportBelt(world, { x: 10, y: 10, variant: "vertical-down" });
    spawnTransportBelt(world, { x: 10, y: 30, variant: "vertical-down" });
    const sideFeederBeltId = spawnTransportBelt(world, { x: 30, y: 10, variant: "horizontal-left" });

    TransportBeltAutoShapeManager.refreshAffectedBelts(world, sideFeederBeltId);

    expect(world.require(middleBeltId, ConveyorBeltComponent).variant).toBe("vertical-down");

    destroyTransportBelt(world, upperBeltId);
    TransportBeltAutoShapeManager.refreshBeltsNearCoordinates(
      world,
      GridSingleton.worldToGridCoordinates(10, -10),
    );

    expect(world.require(middleBeltId, ConveyorBeltComponent).variant).toBe("angled-right-bottom");

    const readdedUpperBeltId = spawnTransportBelt(world, { x: 10, y: -10, variant: "vertical-down" });

    TransportBeltAutoShapeManager.refreshAffectedBelts(world, readdedUpperBeltId);

    expect(world.require(middleBeltId, ConveyorBeltComponent).variant).toBe("vertical-down");
  });

  it("does not flatten a valid curve when a straight belt is added on its head side", () => {
    const world = new UserWorld(new World("scene"));

    spawnTransportBelt(world, { x: 10, y: -10, variant: "vertical-down" });
    const curvedBeltId = spawnTransportBelt(world, { x: 10, y: 10, variant: "angled-bottom-right" });
    const placedBeltId = spawnTransportBelt(world, { x: 10, y: 30, variant: "vertical-up" });

    TransportBeltAutoShapeManager.refreshAffectedBelts(world, placedBeltId);

    expect(world.require(curvedBeltId, ConveyorBeltComponent).variant).toBe("angled-bottom-right");
  });

  it("reverts a bent belt back to straight when the side feeder is removed", () => {
    const world = new UserWorld(new World("scene"));

    const sideFeederBeltId = spawnTransportBelt(world, { x: 10, y: 10, variant: "horizontal-right" });
    const bentBeltId = spawnTransportBelt(world, { x: 30, y: 10, variant: "vertical-up" });

    TransportBeltAutoShapeManager.refreshAffectedBelts(world, sideFeederBeltId);

    expect(world.require(bentBeltId, ConveyorBeltComponent).variant).toBe("angled-left-up");

    destroyTransportBelt(world, sideFeederBeltId);
    TransportBeltAutoShapeManager.refreshBeltsNearCoordinates(
      world,
      GridSingleton.worldToGridCoordinates(10, 10),
    );

    expect(world.require(bentBeltId, ConveyorBeltComponent).variant).toBe("vertical-up");
  });

  it("straightens a bottom-right belt when an opposite straight feeder is added later", () => {
    const world = new UserWorld(new World("scene"));

    spawnTransportBelt(world, { x: 10, y: 50, variant: "vertical-up" });
    const middleBeltId = spawnTransportBelt(world, { x: 10, y: 30, variant: "angled-bottom-right" });
    const eastBeltId = spawnTransportBelt(world, { x: 30, y: 30, variant: "horizontal-right" });

    TransportBeltAutoShapeManager.refreshAffectedBelts(world, eastBeltId);

    expect(world.require(middleBeltId, ConveyorBeltComponent).variant).toBe("angled-bottom-right");

    const westBeltId = spawnTransportBelt(world, { x: -10, y: 30, variant: "horizontal-right" });

    TransportBeltAutoShapeManager.refreshAffectedBelts(world, westBeltId);

    expect(world.require(middleBeltId, ConveyorBeltComponent).variant).toBe("horizontal-right");
  });

  it("preserves an existing valid bend when a competing backside belt is added", () => {
    const world = new UserWorld(new World("scene"));

    spawnTransportBelt(world, { x: 10, y: 30, variant: "angled-right-up" });
    const bentBeltId = spawnTransportBelt(world, { x: 10, y: 10, variant: "angled-bottom-right" });
    const placedBeltId = spawnTransportBelt(world, { x: -10, y: 10, variant: "horizontal-right" });

    TransportBeltAutoShapeManager.refreshAffectedBelts(world, placedBeltId);

    expect(world.require(bentBeltId, ConveyorBeltComponent).variant).toBe("angled-bottom-right");
  });
});
