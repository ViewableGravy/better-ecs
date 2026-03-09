import { OUTSIDE } from "@client/components/render-visibility";
import { applyGhostEffect, type GhostPreset } from "@client/entities/ghost";
import { spawnLandClaim } from "@client/entities/land-claim";
import {
  LAND_CLAIM_OWNER_NAME,
} from "@client/entities/land-claim/const";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export const LandClaimGhost: GhostPreset = {
  kind: "land-claim",
  spawn(world, x, y) {
    const landClaimEntityId = spawnLandClaim(world, {
      snappedX: x,
      snappedY: y,
      ownerName: LAND_CLAIM_OWNER_NAME,
      renderVisibilityRole: OUTSIDE,
    });

    return applyGhostEffect(world, landClaimEntityId, this.kind);
  },
};
