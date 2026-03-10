import { OUTSIDE } from "@client/components/render-visibility";
import { createEntityGhostPreset } from "@client/entities/ghost";
import { spawnLandClaim } from "@client/entities/land-claim";
import {
  LAND_CLAIM_OWNER_NAME,
} from "@client/entities/land-claim/const";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export const LandClaimGhost = createEntityGhostPreset({
  kind: "land-claim",
  spawn(world, x, y) {
    return spawnLandClaim(world, {
      snappedX: x,
      snappedY: y,
      ownerName: LAND_CLAIM_OWNER_NAME,
      renderVisibilityRole: OUTSIDE,
    });
  },
});
