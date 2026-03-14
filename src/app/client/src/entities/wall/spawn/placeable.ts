import { OUTSIDE, RenderVisibility, type RenderVisibilityRole } from "@client/components/render-visibility";
import { PlaceableWallComponent } from "@client/entities/wall/components";
import type { PlaceableWallVisualVariant } from "@client/entities/wall/query/variant";
import { createPlaceableWallSprite } from "@client/entities/wall/render/createPlaceableWallSprite";
import { CollisionProfiles } from "@client/scenes/world/physics/collision-profiles";
import { GridFootprint } from "@client/systems/world/build-mode/components/grid-footprint";
import { GridPosition } from "@client/systems/world/build-mode/components/grid-position";
import { Placeable } from "@client/systems/world/build-mode/components/placeable";
import { GridSingleton } from "@client/systems/world/build-mode/grid-singleton";
import {
    BOX_SIZE,
    HALF_BOX_SIZE,
} from "@client/systems/world/build-mode/metrics";
import { Vec2, type EntityId, type UserWorld } from "@engine";
import { Debug, Transform2D } from "@engine/components";
import { RectangleCollider } from "@libs/physics";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/

type SpawnPlacedPlaceableWallOptions = {
	snappedX: number;
	snappedY: number;
	renderVisibilityRole?: RenderVisibilityRole;
	spriteVariant?: PlaceableWallVisualVariant;
	profile?: "placed";
};

type SpawnPreviewPlaceableWallOptions = {
	snappedX: number;
	snappedY: number;
	spriteVariant?: PlaceableWallVisualVariant;
	profile: "preview";
};

type SpawnPlaceableWallOptions = SpawnPlacedPlaceableWallOptions | SpawnPreviewPlaceableWallOptions;

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export function spawnPlaceableWall(world: UserWorld, options: SpawnPlaceableWallOptions): EntityId {
	const wallEntityId = world.create();
	const centerX = options.snappedX + HALF_BOX_SIZE;
	const centerY = options.snappedY + HALF_BOX_SIZE;
	const spriteVariant = options.spriteVariant ?? "single-1";

	world.add(wallEntityId, new Transform2D(centerX, centerY));
	world.add(wallEntityId, createPlaceableWallSprite(spriteVariant, centerY));

	if (options.profile === "preview") {
		world.add(wallEntityId, new Debug("wall-ghost"));

		return wallEntityId;
	}

	const [gridX, gridY] = GridSingleton.worldToGridCoordinates(options.snappedX, options.snappedY);

	world.add(
		wallEntityId,
		new RectangleCollider(
			new Vec2(-HALF_BOX_SIZE, -HALF_BOX_SIZE),
			new Vec2(BOX_SIZE, BOX_SIZE),
		),
	);
	world.add(wallEntityId, CollisionProfiles.solid());
	world.add(wallEntityId, new GridPosition(gridX, gridY));
	world.add(wallEntityId, new GridFootprint(BOX_SIZE, BOX_SIZE));
	world.add(wallEntityId, new PlaceableWallComponent());
	world.add(wallEntityId, new Placeable("wall"));
	world.add(wallEntityId, new RenderVisibility(options.renderVisibilityRole ?? OUTSIDE, 1));
	world.add(wallEntityId, new Debug("wall-placeable"));

	return wallEntityId;
}
