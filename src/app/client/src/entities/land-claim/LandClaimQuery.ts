import { GridPosition } from "@client/systems/world/build-mode/components";
import type { GridCoordinates } from "@client/systems/world/build-mode/grid-singleton";
import type { EntityId, UserWorld } from "@engine";

import { LandClaim } from "@client/entities/land-claim/component";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/

type ClaimCoverageType = "owned" | "buildable";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export class LandClaimQuery {
  public static findOwnedClaimAtCoordinates(world: UserWorld, gridCoordinates: GridCoordinates): EntityId | undefined {
    return this.findClaimAtCoordinates(world, gridCoordinates, "owned");
  }

  public static findBuildableClaimAtCoordinates(world: UserWorld, gridCoordinates: GridCoordinates): EntityId | undefined {
    return this.findClaimAtCoordinates(world, gridCoordinates, "buildable");
  }

  public static isWithinOwnedArea(world: UserWorld, gridCoordinates: GridCoordinates): boolean {
    return this.findOwnedClaimAtCoordinates(world, gridCoordinates) !== undefined;
  }

  public static isWithinBuildableArea(world: UserWorld, gridCoordinates: GridCoordinates): boolean {
    return this.findBuildableClaimAtCoordinates(world, gridCoordinates) !== undefined;
  }

  private static findClaimAtCoordinates(
    world: UserWorld,
    gridCoordinates: GridCoordinates,
    coverageType: ClaimCoverageType,
  ): EntityId | undefined {
    for (const claimEntityId of world.query(LandClaim, GridPosition)) {
      const landClaim = world.require(claimEntityId, LandClaim);
      const gridPosition = world.require(claimEntityId, GridPosition);
      const coverageRadius = coverageType === "owned"
        ? landClaim.ownedRadiusTiles
        : landClaim.buildableRadiusTiles;

      if (!this.isWithinCoverage(gridCoordinates, gridPosition, coverageRadius)) {
        continue;
      }

      return claimEntityId;
    }

    return undefined;
  }

  private static isWithinCoverage(gridCoordinates: GridCoordinates, gridPosition: GridPosition, coverageRadius: number): boolean {
    const [gridX, gridY] = gridCoordinates;
    const deltaX = Math.abs(Number(gridX) - Number(gridPosition.x));
    const deltaY = Math.abs(Number(gridY) - Number(gridPosition.y));

    return deltaX <= coverageRadius && deltaY <= coverageRadius;
  }
}
