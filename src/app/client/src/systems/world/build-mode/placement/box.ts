import { spawnBox } from "@client/entities/box";
import { BoxGhost } from "@client/entities/box/ghost";

import { createPlacementDefinition } from "@client/systems/world/build-mode/placement/createPlacementDefinition";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export const boxPlacementDefinition = createPlacementDefinition({
  item: "box",
  ghost: BoxGhost,
  spawn({ world, snappedX, snappedY, renderVisibilityRole }) {
    spawnBox(world, {
      snappedX,
      snappedY,
      renderVisibilityRole,
    });
  },
});
