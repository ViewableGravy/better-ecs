import { spawnLandClaim } from "@client/entities/land-claim";
import { LAND_CLAIM_OWNER_NAME } from "@client/entities/land-claim/const";
import { LandClaimGhost } from "@client/entities/land-claim/ghost";

import { createPlacementDefinition } from "@client/systems/world/build-mode/placement/createPlacementDefinition";
import { PlacementQueries } from "@client/systems/world/build-mode/placement/queries";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export const landClaimPlacementDefinition = createPlacementDefinition({
  item: "land-claim",
  ghost: LandClaimGhost,
  canPlace({ world, gridCoordinates }) {
    return PlacementQueries.queryFirstPlacementOverlap(world, gridCoordinates) === undefined;
  },
  spawn({ world, snappedX, snappedY, renderVisibilityRole }) {
    spawnLandClaim(world, {
      snappedX,
      snappedY,
      ownerName: LAND_CLAIM_OWNER_NAME,
      renderVisibilityRole,
    });
  },
});
