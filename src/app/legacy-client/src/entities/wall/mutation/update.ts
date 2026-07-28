import { RENDER_LAYERS } from "@legacy/consts";
import type { PlaceableWallVisualVariant } from "@legacy/entities/wall/query/variant";
import { createPlaceableWallSprite } from "@legacy/entities/wall/render/createPlaceableWallSprite";
import { HALF_BOX_SIZE } from "@legacy/systems/world/build-mode/const";
import type { EntityId, Registry } from "@engine";
import { Sprite, Transform2D } from "@engine/components";

export function updatePlaceableWallVisual(
	world: Registry,
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
		createPlaceableWallSprite(spriteVariant, transform.curr.pos.y + HALF_BOX_SIZE, currentSprite),
	);
}
