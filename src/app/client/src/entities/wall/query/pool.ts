import { BOX_SIZE } from "@client/systems/world/build-mode/metrics";

export const PLACEABLE_WALL_SINGLE_VARIANTS = [
	"single-1",
	"single-2",
] as const;

export const PLACEABLE_WALL_ENDING_LEFT_VARIANTS = [
	"ending-left-1",
	"ending-left-2",
] as const;

export const PLACEABLE_WALL_ENDING_RIGHT_VARIANTS = [
	"ending-right-1",
	"ending-right-2",
] as const;

export const PLACEABLE_WALL_HORIZONTAL_VARIANTS = [
	"horizontal-1",
	"horizontal-2",
	"horizontal-3",
	"horizontal-4",
	"horizontal-5",
	"horizontal-6",
] as const;

export const PLACEABLE_WALL_VARIANTS = [
	...PLACEABLE_WALL_SINGLE_VARIANTS,
	...PLACEABLE_WALL_ENDING_LEFT_VARIANTS,
	...PLACEABLE_WALL_ENDING_RIGHT_VARIANTS,
	...PLACEABLE_WALL_HORIZONTAL_VARIANTS,
] as const;

export const PLACEABLE_WALL_ASSET_ID_BY_VARIANT = {
	"single-1": "wall-single:1",
	"single-2": "wall-single:2",
	"ending-left-1": "wall-ending-left:1",
	"ending-left-2": "wall-ending-left:2",
	"ending-right-1": "wall-ending-right:1",
	"ending-right-2": "wall-ending-right:2",
	"horizontal-1": "wall-horizontal:1",
	"horizontal-2": "wall-horizontal:2",
	"horizontal-3": "wall-horizontal:3",
	"horizontal-4": "wall-horizontal:4",
	"horizontal-5": "wall-horizontal:5",
	"horizontal-6": "wall-horizontal:6",
} as const;

export const PLACEABLE_WALL_RENDER_WIDTH = BOX_SIZE;
export const PLACEABLE_WALL_RENDER_HEIGHT = 28;
export const PLACEABLE_WALL_Z_BASE = 0.31;
export const PLACEABLE_WALL_Z_PER_WORLD_Y = 0.000001;
