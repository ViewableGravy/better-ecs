import { RENDER_LAYERS } from "@client/consts";
import {
    PLACEABLE_WALL_ASSET_ID_BY_VARIANT,
    PLACEABLE_WALL_RENDER_HEIGHT,
    PLACEABLE_WALL_RENDER_WIDTH,
    PLACEABLE_WALL_Z_BASE,
    PLACEABLE_WALL_Z_PER_WORLD_Y,
} from "@client/entities/wall/query/pool";
import type { PlaceableWallVisualVariant } from "@client/entities/wall/query/variant";
import { Color, Sprite } from "@engine/components";

export function createPlaceableWallSprite(
  variant: PlaceableWallVisualVariant,
  worldY: number,
  previousSprite?: Sprite,
): Sprite {
  const sprite = new Sprite(
    PLACEABLE_WALL_ASSET_ID_BY_VARIANT[variant],
    PLACEABLE_WALL_RENDER_WIDTH,
    PLACEABLE_WALL_RENDER_HEIGHT,
    previousSprite?.anchorX,
    previousSprite?.anchorY,
    previousSprite?.flipX,
    previousSprite?.flipY,
    previousSprite
      ? new Color(
        previousSprite.tint.r,
        previousSprite.tint.g,
        previousSprite.tint.b,
        previousSprite.tint.a,
      )
      : undefined,
  );

  sprite.layer = previousSprite?.layer ?? RENDER_LAYERS.world;
  sprite.zOrder = PLACEABLE_WALL_Z_BASE + worldY * PLACEABLE_WALL_Z_PER_WORLD_Y;
  sprite.isDynamic = previousSprite?.isDynamic ?? true;

  return sprite;
}