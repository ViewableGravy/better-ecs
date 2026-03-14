import { spawnLandClaim } from "@client/entities/land-claim";
import { LAND_CLAIM_OWNER_NAME } from "@client/entities/land-claim/const";
import { LandClaimGhost } from "@client/entities/land-claim/ghost";

import { createGhostPreviewAdapter } from "@client/systems/world/build-mode/placement/preview";
import { createBuildItemSpec } from "@client/systems/world/build-mode/placement/spec";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export const landClaimPlacementDefinition = createBuildItemSpec({
  item: "land-claim",
  preview: createGhostPreviewAdapter(LandClaimGhost),
  placement: {
    strategy: {
      requiresBuildableArea: false,
    },
  },
  lifecycle: {
    commit({ world, snappedX, snappedY, renderVisibilityRole }) {
      spawnLandClaim(world, {
        snappedX,
        snappedY,
        ownerName: LAND_CLAIM_OWNER_NAME,
        renderVisibilityRole,
      });
    },
  },
});
