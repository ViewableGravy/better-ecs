import {
    PLACEABLE_WALL_ENDING_LEFT_VARIANTS,
    PLACEABLE_WALL_ENDING_RIGHT_VARIANTS,
    PLACEABLE_WALL_HORIZONTAL_VARIANTS,
    PLACEABLE_WALL_SINGLE_VARIANTS,
    PLACEABLE_WALL_VARIANTS,
} from "@client/entities/wall/query/pool";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/

export type PlaceableWallVisualVariant = (typeof PLACEABLE_WALL_VARIANTS)[number];

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export function derivePlaceableWallSingleVariant(entityId: number): typeof PLACEABLE_WALL_SINGLE_VARIANTS[number] {
	return deriveVariantFromPool(PLACEABLE_WALL_SINGLE_VARIANTS, entityId);
}

export function derivePlaceableWallEndingLeftVariant(entityId: number): typeof PLACEABLE_WALL_ENDING_LEFT_VARIANTS[number] {
	return deriveVariantFromPool(PLACEABLE_WALL_ENDING_LEFT_VARIANTS, entityId);
}

export function derivePlaceableWallEndingRightVariant(entityId: number): typeof PLACEABLE_WALL_ENDING_RIGHT_VARIANTS[number] {
	return deriveVariantFromPool(PLACEABLE_WALL_ENDING_RIGHT_VARIANTS, entityId);
}

export function derivePlaceableWallHorizontalVariant(entityId: number): typeof PLACEABLE_WALL_HORIZONTAL_VARIANTS[number] {
	return deriveVariantFromPool(PLACEABLE_WALL_HORIZONTAL_VARIANTS, entityId);
}

function deriveVariantFromPool<TVariant extends readonly string[]>(
	variants: TVariant,
	entityId: number,
): TVariant[number] {
	const variantIndex = ((entityId % variants.length) + variants.length) % variants.length;

	return variants[variantIndex];
}
