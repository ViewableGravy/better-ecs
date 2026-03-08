import { ConveyorBeltComponent } from "@client/components/conveyor-belt";
import { destroyTransportBelt, spawnTransportBelt } from "@client/entities/transport-belt";
import { GridSingleton } from "@client/systems/world/build-mode/grid-singleton";
import { TransportBeltAutoShapeManager } from "@client/systems/world/build-mode/transport-belt-auto-shape-manager";
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
});