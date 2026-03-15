import { spawnBox } from "@client/entities/box";
import { createGhostPreset } from "@client/entities/ghost/spawner";

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