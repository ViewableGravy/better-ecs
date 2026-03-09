import { OUTSIDE } from "@client/components/render-visibility";
import { spawnBox } from "@client/entities/box";
import { applyGhostEffect, type GhostPreset } from "@client/entities/ghost";

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

    return applyGhostEffect(world, boxEntityId, this.kind);
  },
};