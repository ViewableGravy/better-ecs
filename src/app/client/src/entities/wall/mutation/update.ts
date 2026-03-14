import { RENDER_LAYERS } from "@client/consts";
import type { PlaceableWallVisualVariant } from "@client/entities/wall/query/variant";
import { createPlaceableWallSprite } from "@client/entities/wall/render/createPlaceableWallSprite";
import type { EntityId, UserWorld } from "@engine";
import { Sprite, Transform2D } from "@engine/components";

export function updatePlaceableWallVisual(
	world: UserWorld,
	wallEntityId: EntityId,
	spriteVariant: PlaceableWallVisualVariant,
): void {
	const transform = world.require(wallEntityId, Transform2D);
	const currentSprite = world.get(wallEntityId, Sprite);

	if (currentSprite) {
		currentSprite.layer = RENDER_LAYERS.world;
	}

	world.add(
		wallEntityId,
		createPlaceableWallSprite(spriteVariant, transform.curr.pos.y, currentSprite),
	);
}
