import { OUTSIDE } from "@client/components/render-visibility";
import { spawnBox } from "@client/entities/box";
import { GhostUtils, type GhostPreset } from "@client/entities/ghost";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export const BoxGhost: GhostPreset = {
  kind: "box",
  spawn(world, x, y) {
    const boxEntityId = spawnBox(world, {
      snappedX: x,
      snappedY: y,
      renderVisibilityRole: OUTSIDE,
    });

    return GhostUtils.applyEffect(world, boxEntityId, this.kind);
  },
};