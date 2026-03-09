import { ConveyorBeltComponent } from "@client/components/conveyor-belt";
import { destroyTransportBelt, spawnTransportBelt } from "@client/entities/transport-belt";
import { GridSingleton } from "@client/systems/world/build-mode/grid-singleton";
import { TransportBeltAutoShapeManager } from "@client/systems/world/build-mode/transport-belt-auto-shape-manager";
import { UserWorld, World } from "@engine";
import { describe, expect, it } from "vitest";

describe("TransportBeltAutoShapeManager", () => {
  /**
   * One feeder uniquely enters the middle belt from the right, so the middle
   * belt should bend to accept it.
   *
   * Before
   *   ← ┘
   *     │ ← placed
   *
   * After
   *   ← ┘
   *     └←
   */
  it("bends a belt when exactly one side neighbor uniquely feeds its start", () => {
    const world = new UserWorld(new World("scene"));

    spawnTransportBelt(world, { x: 10, y: 10, variant: "horizontal-left" });
    spawnTransportBelt(world, { x: 30, y: 10, variant: "angled-top-left" });
    const middleBeltId = spawnTransportBelt(world, { x: 30, y: 30, variant: "vertical-down" });
    const placedBeltId = spawnTransportBelt(world, { x: 50, y: 30, variant: "horizontal-left" });

    TransportBeltAutoShapeManager.refreshAffectedBelts(world, placedBeltId);

    expect(world.require(middleBeltId, ConveyorBeltComponent).variant).toBe("angled-right-bottom");
  });

  /**
   * Two side feeders compete for the same middle belt, so the existing
   * straight direction should win.
   *
   *   ← ┘
   * ← │ ←
   *
   * Result
   *   middle stays vertical
   */
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

  /**
   * The belt already has a valid incoming tail from above, so a new side belt
   * must not bend it away from that straight chain.
   *
   *   │
   *   │ ← placed
   *   │
   */
  it("prefers staying straight when the original tail already has an incoming belt", () => {
    const world = new UserWorld(new World("scene"));

    spawnTransportBelt(world, { x: 10, y: -10, variant: "vertical-down" });
    const middleBeltId = spawnTransportBelt(world, { x: 10, y: 10, variant: "vertical-down" });
    spawnTransportBelt(world, { x: 10, y: 30, variant: "vertical-down" });
    const placedBeltId = spawnTransportBelt(world, { x: 30, y: 10, variant: "horizontal-left" });

    TransportBeltAutoShapeManager.refreshAffectedBelts(world, placedBeltId);

    expect(world.require(middleBeltId, ConveyorBeltComponent).variant).toBe("vertical-down");
  });

  /**
   * A horizontal line already has its real tail feeding into the middle belt,
   * so a vertical side feeder below must not rotate the middle belt away from
   * that straight line.
   *
   *   ─ ─ ─
   *     ↑ placed
   */
  it("keeps a horizontal line straight when a side feeder faces its middle belt", () => {
    const world = new UserWorld(new World("scene"));

    spawnTransportBelt(world, { x: -10, y: 10, variant: "horizontal-right" });
    const middleBeltId = spawnTransportBelt(world, { x: 10, y: 10, variant: "horizontal-right" });
    spawnTransportBelt(world, { x: 30, y: 10, variant: "horizontal-right" });
    const placedBeltId = spawnTransportBelt(world, { x: 10, y: 30, variant: "vertical-up" });

    TransportBeltAutoShapeManager.refreshAffectedBelts(world, placedBeltId);

    expect(world.require(middleBeltId, ConveyorBeltComponent).variant).toBe("horizontal-right");
  });

  /**
   * A middle belt can temporarily bend when its upstream straight belt is
   * removed, but restoring that upstream straight should make the middle belt
   * straight again even if the side feeder still exists.
   *
   * Start / expected end
   *   │
   *   │←
   *   │
   *
   * Temporary middle state after removing the upper belt
   *   ╰←
   *   │
   */
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

  /**
   * A downstream straight belt must not reach backward through the curve and
   * flatten it. Only the tail-facing side should influence the next belt.
   *
   *   │
   *   └→
   *   │
   */
  it("does not flatten a valid curve when a straight belt is added on its head side", () => {
    const world = new UserWorld(new World("scene"));

    spawnTransportBelt(world, { x: 10, y: -10, variant: "vertical-down" });
    const curvedBeltId = spawnTransportBelt(world, { x: 10, y: 10, variant: "angled-bottom-right" });
    const placedBeltId = spawnTransportBelt(world, { x: 10, y: 30, variant: "vertical-up" });

    TransportBeltAutoShapeManager.refreshAffectedBelts(world, placedBeltId);

    expect(world.require(curvedBeltId, ConveyorBeltComponent).variant).toBe("angled-bottom-right");
  });

  /**
   * A side feeder temporarily bends the target belt, then removing that feeder
   * should restore the straight vertical shape.
   *
   * Before remove
   *   → ┌
   *
   * After remove
   *     │
   */
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

  /**
   * The middle belt already has a valid bend from below, so adding a competing
   * backside belt on the left must not reshape it.
   *
   *   └→
   * → ┘
   *
   * Result
   *   middle keeps the existing bend
   */
  it("preserves an existing valid bend when a competing backside belt is added", () => {
    const world = new UserWorld(new World("scene"));

    spawnTransportBelt(world, { x: 10, y: 30, variant: "angled-right-up" });
    const bentBeltId = spawnTransportBelt(world, { x: 10, y: 10, variant: "angled-bottom-right" });
    const placedBeltId = spawnTransportBelt(world, { x: -10, y: 10, variant: "horizontal-right" });

    TransportBeltAutoShapeManager.refreshAffectedBelts(world, placedBeltId);

    expect(world.require(bentBeltId, ConveyorBeltComponent).variant).toBe("angled-bottom-right");
  });
});