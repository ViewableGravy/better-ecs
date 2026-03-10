import { OUTSIDE } from "@client/components/render-visibility";
import { spawnBox } from "@client/entities/box";
import { createEntityGhostPreset } from "@client/entities/ghost/spawner";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export const BoxGhost = createEntityGhostPreset({
  kind: "box",
  spawn(world, x, y) {
    return spawnBox(world, {
      snappedX: x,
      snappedY: y,
      renderVisibilityRole: OUTSIDE,
    });
  },
});