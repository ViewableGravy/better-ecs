import { ConveyorBeltComponent } from "@client/components/conveyor-belt";
import { spawnTransportBelt } from "@client/entities/transport-belt";
import { TransportBeltRotationVariantManager } from "@client/entities/transport-belt/placement/TransportBeltRotationVariantManager";
import { GridSingleton } from "@client/systems/world/build-mode/grid-singleton";
import { UserWorld, World } from "@engine";
import { describe, expect, it } from "vitest";

describe("TransportBeltRotationVariantManager", () => {
  it("derives the default straight preview variant when no neighbors contribute", () => {
    const world = new UserWorld(new World("scene"));

    expect(
      TransportBeltRotationVariantManager.deriveBeltVariant(world, {
        coordinates: GridSingleton.worldToGridCoordinates(0, 0),
        endSide: "right",
      }),
    ).toBe("horizontal-right");
  });

  it("bends the preview tail when exactly one side neighbor feeds the tile", () => {
    const world = new UserWorld(new World("scene"));

    spawnTransportBelt(world, { x: -20, y: 0, variant: "horizontal-right" });

    expect(
      TransportBeltRotationVariantManager.deriveBeltVariant(world, {
        coordinates: GridSingleton.worldToGridCoordinates(0, 0),
        endSide: "top",
      }),
    ).toBe("angled-left-up");
  });

  it("prefers the back connection over a competing side feeder for preview orientation", () => {
    const world = new UserWorld(new World("scene"));

    spawnTransportBelt(world, { x: -20, y: 0, variant: "horizontal-right" });
    spawnTransportBelt(world, { x: 0, y: 20, variant: "vertical-up" });

    expect(
      TransportBeltRotationVariantManager.deriveBeltVariant(world, {
        coordinates: GridSingleton.worldToGridCoordinates(0, 0),
        endSide: "right",
      }),
    ).toBe("horizontal-right");
  });

  it("preserves a placed belt's valid incoming side before re-bending it", () => {
    const world = new UserWorld(new World("scene"));

    spawnTransportBelt(world, { x: 0, y: 20, variant: "vertical-up" });
    const beltEntityId = spawnTransportBelt(world, { x: 0, y: 0, variant: "angled-bottom-right" });

    expect(TransportBeltRotationVariantManager.deriveBeltVariant(world, { beltEntityId })).toBe("angled-bottom-right");
  });

  it("keeps a placed belt straight when its back feeds a head-side consumer", () => {
    const world = new UserWorld(new World("scene"));

    spawnTransportBelt(world, { x: -20, y: 0, variant: "horizontal-right" });
    const beltEntityId = spawnTransportBelt(world, { x: 0, y: 0, variant: "angled-bottom-right" });
    spawnTransportBelt(world, { x: 20, y: 0, variant: "horizontal-right" });

    expect(world.require(beltEntityId, ConveyorBeltComponent).variant).toBe("angled-bottom-right");
    expect(TransportBeltRotationVariantManager.deriveBeltVariant(world, { beltEntityId })).toBe("horizontal-right");
  });
});