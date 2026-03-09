import { OUTSIDE } from "@client/components/render-visibility";
import { spawnLandClaim } from "@client/entities/land-claim";
import {
  LAND_CLAIM_OWNER_NAME,
} from "@client/entities/land-claim/const";
import { PhysicsWorldManager } from "@client/scenes/world/physics/physics-world-manager";
import { GridSingleton } from "@client/systems/world/build-mode/grid-singleton";
import { Placement } from "@client/systems/world/build-mode/placement";
import { UserWorld, World } from "@engine";
import { describe, expect, it } from "vitest";

describe("Placement", () => {
  it("restricts regular placement to claim buildable territory", () => {
    const world = new UserWorld(new World("scene"));
    const [snappedX, snappedY] = GridSingleton.gridCoordinatesToWorldOrigin(
      GridSingleton.worldToGridCoordinates(0, 0),
    );

    PhysicsWorldManager.beginFrame([world]);

    expect(Placement.canPlaceItem(world, GridSingleton.worldToGridCoordinates(20, 0), "box")).toBe(false);

    spawnLandClaim(world, {
      snappedX,
      snappedY,
      ownerName: LAND_CLAIM_OWNER_NAME,
      renderVisibilityRole: OUTSIDE,
    });

    PhysicsWorldManager.beginFrame([world]);

    expect(Placement.canPlaceItem(world, GridSingleton.worldToGridCoordinates(20, 0), "box")).toBe(true);
    expect(Placement.canPlaceItem(world, GridSingleton.worldToGridCoordinates(280, 0), "transport-belt")).toBe(true);
    expect(Placement.canPlaceItem(world, GridSingleton.worldToGridCoordinates(300, 0), "box")).toBe(false);
    expect(Placement.canPlaceItem(world, GridSingleton.worldToGridCoordinates(300, 0), "transport-belt")).toBe(false);
  });

  it("keeps land claims placeable outside existing claim territory when the tile is empty", () => {
    const world = new UserWorld(new World("scene"));
    const [snappedX, snappedY] = GridSingleton.gridCoordinatesToWorldOrigin(
      GridSingleton.worldToGridCoordinates(0, 0),
    );

    spawnLandClaim(world, {
      snappedX,
      snappedY,
      ownerName: LAND_CLAIM_OWNER_NAME,
      renderVisibilityRole: OUTSIDE,
    });

    PhysicsWorldManager.beginFrame([world]);

    expect(Placement.canPlaceItem(world, GridSingleton.worldToGridCoordinates(400, 0), "land-claim")).toBe(true);
    expect(Placement.canPlaceItem(world, GridSingleton.worldToGridCoordinates(0, 0), "land-claim")).toBe(false);
  });
});
