import { spawnBox } from "@legacy/entities/box";
import { BoxGhost } from "@legacy/entities/box/ghost";

import { createGhostPreviewAdapter } from "@legacy/systems/world/build-mode/placement/preview";
import { createBuildItemSpec } from "@legacy/systems/world/build-mode/placement/spec";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export const boxPlacementDefinition = createBuildItemSpec({
  item: "box",
  preview: createGhostPreviewAdapter(BoxGhost),
  lifecycle: {
    commit({ world, snappedX, snappedY }) {
      spawnBox(world, {
        snappedX,
        snappedY,
      });
    },
  },
});
