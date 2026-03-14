import { GhostPreviewComponent } from "@client/entities/ghost/component";
import { createGhostPreset } from "@client/entities/ghost/spawner";
import { updatePlaceableWallVisual } from "@client/entities/wall/mutation/update";
import {
    derivePlaceableWallSingleVariant,
    type PlaceableWallVisualVariant,
} from "@client/entities/wall/query/variant";
import { spawnPlaceableWall } from "@client/entities/wall/spawn/placeable";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

const DEFAULT_PLACEABLE_WALL_VARIANT: PlaceableWallVisualVariant = derivePlaceableWallSingleVariant(0);

export const PlaceableWallGhost = createGhostPreset<PlaceableWallVisualVariant>({
	kind: "wall",
	spawn(world, x, y, variant) {
		return spawnPlaceableWall(world, {
			snappedX: x,
			snappedY: y,
			spriteVariant: variant ?? DEFAULT_PLACEABLE_WALL_VARIANT,
			profile: "preview",
		});
	},
	resolvePreviewVariant(variant) {
		return variant ?? DEFAULT_PLACEABLE_WALL_VARIANT;
	},
	sync(world, ghostEntityId, variant) {
		const derivedVariant = variant ?? DEFAULT_PLACEABLE_WALL_VARIANT;

		updatePlaceableWallVisual(world, ghostEntityId, derivedVariant);

		const ghostPreview = world.require(ghostEntityId, GhostPreviewComponent);
		ghostPreview.previewVariant = derivedVariant;
	},
});
