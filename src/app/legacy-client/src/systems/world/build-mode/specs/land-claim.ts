import { spawnLandClaim } from "@legacy/entities/land-claim";
import { LAND_CLAIM_OWNER_NAME } from "@legacy/entities/land-claim/const";
import { LandClaimGhost } from "@legacy/entities/land-claim/ghost";

import { createGhostPreviewAdapter } from "@legacy/systems/world/build-mode/placement/preview";
import { createBuildItemSpec } from "@legacy/systems/world/build-mode/placement/spec";

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
    commit({ world, snappedX, snappedY }) {
      spawnLandClaim(world, {
        snappedX,
        snappedY,
        ownerName: LAND_CLAIM_OWNER_NAME,
      });
    },
  },
});
