import { createGhostPreset } from "@client/entities/ghost/spawner";
import { spawnLandClaim } from "@client/entities/land-claim";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export const LandClaimGhost = createGhostPreset({
  kind: "land-claim",
  spawn(world, x, y) {
    return spawnLandClaim(world, {
      snappedX: x,
      snappedY: y,
      profile: "preview",
    });
  },
});
