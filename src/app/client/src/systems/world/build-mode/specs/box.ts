import { spawnBox } from "@client/entities/box";
import { BoxGhost } from "@client/entities/box/ghost";

import { createGhostPreviewAdapter } from "@client/systems/world/build-mode/placement/preview";
import { createBuildItemSpec } from "@client/systems/world/build-mode/placement/spec";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export const boxPlacementDefinition = createBuildItemSpec({
  item: "box",
  preview: createGhostPreviewAdapter(BoxGhost),
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
