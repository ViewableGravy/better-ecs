import { GridSingleton } from "@client/systems/world/build-mode/grid-singleton";
import { Color } from "@engine/components";

/**********************************************************************************************************
 *   CONSTS
 **********************************************************************************************************/

export const LAND_CLAIM_OWNER_NAME = "ViewableGravy";
export const LAND_CLAIM_OWNED_SIZE_TILES = 9;
export const LAND_CLAIM_BUILDABLE_SIZE_TILES = 29;
export const LAND_CLAIM_OWNED_RADIUS_TILES = (LAND_CLAIM_OWNED_SIZE_TILES - 1) / 2;
export const LAND_CLAIM_BUILDABLE_RADIUS_TILES = (LAND_CLAIM_BUILDABLE_SIZE_TILES - 1) / 2;

export const LAND_CLAIM_OWNED_WORLD_SIZE = LAND_CLAIM_OWNED_SIZE_TILES * GridSingleton.cellSize;
export const LAND_CLAIM_BUILDABLE_WORLD_SIZE = LAND_CLAIM_BUILDABLE_SIZE_TILES * GridSingleton.cellSize;

export const LAND_CLAIM_FLAG_POLE_WIDTH = 4;
export const LAND_CLAIM_FLAG_POLE_HEIGHT = 26;
export const LAND_CLAIM_FLAG_WIDTH = 12;
export const LAND_CLAIM_FLAG_HEIGHT = 10;
export const LAND_CLAIM_FLAG_OFFSET_X = 8;
export const LAND_CLAIM_FLAG_OFFSET_Y = -8;
export const LAND_CLAIM_NAMEPLATE_WIDTH = 88;
export const LAND_CLAIM_NAMEPLATE_HEIGHT = 20;
export const LAND_CLAIM_NAMEPLATE_OFFSET_Y = -30;

export const LAND_CLAIM_POLE_FILL = new Color(0.56, 0.39, 0.22, 1);
export const LAND_CLAIM_POLE_STROKE = new Color(0.33, 0.2, 0.1, 1);
export const LAND_CLAIM_FLAG_FILL = new Color(0.18, 0.76, 0.38, 1);
export const LAND_CLAIM_FLAG_STROKE = new Color(0.87, 0.98, 0.9, 1);
export const LAND_CLAIM_OWNED_FILL = new Color(0.56, 0.9, 0.62, 0.01);
export const LAND_CLAIM_BUILDABLE_FILL = new Color(0.95, 0.9, 0.62, 0.025);

export const LAND_CLAIM_NAMEPLATE_ASSET_ID = "land-claim:viewable-gravy-nameplate";
