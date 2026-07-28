import { spawnBox } from "@legacy/entities/box";
import { createGhostPreset } from "@legacy/entities/ghost/spawner";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export const BoxGhost = createGhostPreset({
  kind: "box",
  spawn(world, x, y) {
    return spawnBox(world, {
      snappedX: x,
      snappedY: y,
      profile: "preview",
    });
  },
});