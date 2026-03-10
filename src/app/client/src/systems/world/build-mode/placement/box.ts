import { spawnBox } from "@client/entities/box";
import { BoxGhost } from "@client/entities/box/ghost";

import { createBuildItemSpec } from "@client/systems/world/build-mode/placement/spec";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export const boxPlacementDefinition = createBuildItemSpec({
  item: "box",
  ghost: BoxGhost,
  lifecycle: {
    commit({ world, snappedX, snappedY, renderVisibilityRole }) {
      spawnBox(world, {
        snappedX,
        snappedY,
        renderVisibilityRole,
      });
    },
  },
});
