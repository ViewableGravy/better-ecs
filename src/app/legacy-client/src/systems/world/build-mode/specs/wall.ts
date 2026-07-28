import {
    PlaceableWallAutoShapeManager,
    spawnPlaceableWall,
} from "@legacy/entities/wall";
import type { PlaceableWallVisualVariant } from "@legacy/entities/wall/query/variant";
import { PlaceableWallGhost } from "@legacy/entities/wall/spawn/ghost";
import { createGhostPreviewAdapter } from "@legacy/systems/world/build-mode/placement/preview";
import { createBuildItemSpec } from "@legacy/systems/world/build-mode/placement/spec";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export const wallPlacementDefinition = createBuildItemSpec<PlaceableWallVisualVariant>({
  item: "wall",
  preview: createGhostPreviewAdapter(PlaceableWallGhost),
  dragPlacementMode: "paint",
  resolvePayload({ previewWorld, gridCoordinates }) {
    return PlaceableWallAutoShapeManager.deriveVariantAtCoordinates(previewWorld, gridCoordinates);
  },
  lifecycle: {
    commit({ world, snappedX, snappedY }, spriteVariant) {
      const wallEntityId = spawnPlaceableWall(world, {
        snappedX,
        snappedY,
        spriteVariant,
      });

      PlaceableWallAutoShapeManager.refreshAffectedWalls(world, wallEntityId);
    },
  },
});
