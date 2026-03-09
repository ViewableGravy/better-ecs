import { OUTSIDE } from "@client/components/render-visibility";
import { LandClaimQuery, spawnLandClaim } from "@client/entities/land-claim";
import {
    LAND_CLAIM_OWNER_NAME,
} from "@client/entities/land-claim/const";
import { GridSingleton } from "@client/systems/world/build-mode/grid-singleton";
import { UserWorld, World } from "@engine";
import { describe, expect, it } from "vitest";

describe("LandClaimQuery", () => {
  it("detects owned and buildable tiles from a placed claim", () => {
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

    expect(LandClaimQuery.isWithinOwnedArea(world, GridSingleton.worldToGridCoordinates(0, 0))).toBe(true);
    expect(LandClaimQuery.isWithinOwnedArea(world, GridSingleton.worldToGridCoordinates(80, 0))).toBe(true);
    expect(LandClaimQuery.isWithinOwnedArea(world, GridSingleton.worldToGridCoordinates(100, 0))).toBe(false);

    expect(LandClaimQuery.isWithinBuildableArea(world, GridSingleton.worldToGridCoordinates(280, 0))).toBe(true);
    expect(LandClaimQuery.isWithinBuildableArea(world, GridSingleton.worldToGridCoordinates(300, 0))).toBe(false);
  });
});
