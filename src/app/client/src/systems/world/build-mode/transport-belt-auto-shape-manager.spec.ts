import { ConveyorBeltComponent } from "@client/components/conveyor-belt";
import { spawnTransportBelt } from "@client/entities/transport-belt";
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
});