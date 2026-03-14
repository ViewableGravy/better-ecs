import {
    PlaceableWallAutoShapeManager,
    spawnPlaceableWall,
} from "@client/entities/wall";
import type { PlaceableWallVisualVariant } from "@client/entities/wall/query/variant";
import { PlaceableWallGhost } from "@client/entities/wall/spawn/ghost";
import { createGhostPreviewAdapter } from "@client/systems/world/build-mode/placement/preview";
import { createBuildItemSpec } from "@client/systems/world/build-mode/placement/spec";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export const wallPlacementDefinition = createBuildItemSpec<PlaceableWallVisualVariant>({
  item: "wall",
  preview: createGhostPreviewAdapter(PlaceableWallGhost),
  resolvePayload({ previewWorld, gridCoordinates }) {
    return PlaceableWallAutoShapeManager.deriveVariantAtCoordinates(previewWorld, gridCoordinates);
  },
  lifecycle: {
    commit({ world, snappedX, snappedY, renderVisibilityRole }, spriteVariant) {
      const wallEntityId = spawnPlaceableWall(world, {
        snappedX,
        snappedY,
        renderVisibilityRole,
        spriteVariant,
      });

      PlaceableWallAutoShapeManager.refreshAffectedWalls(world, wallEntityId);
    },
  },
});