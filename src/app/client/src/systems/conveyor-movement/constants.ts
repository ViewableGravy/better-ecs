import { Vec2 } from "@engine";
import { Transform2D } from "@engine/components";
import { COLLISION_LAYERS } from "@libs/physics";

export const FEET_WIDTH_MULTIPLIER = 0.4;
export const FEET_HEIGHT_MULTIPLIER = 0.2;
export const FEET_Y_OFFSET_MULTIPLIER = 0.75;
export const FEET_MIN_OVERLAP_RATIO = 0.5;
export const BELT_OVERLAP_PADDING = 1;

export const BELT_QUERY_FILTER = {
	category: COLLISION_LAYERS.QUERY,
	mask: COLLISION_LAYERS.CONVEYOR,
};

export const SHARED_MOTION = new Vec2(0, 0);
export const SHARED_FEET_WORLD_TRANSFORM = new Transform2D();
export const SHARED_BELT_WORLD_TRANSFORM = new Transform2D();
export const DIRECTION_RIGHT = new Vec2(1, 0);
export const DIRECTION_LEFT = new Vec2(-1, 0);
export const DIRECTION_UP = new Vec2(0, -1);
export const DIRECTION_DOWN = new Vec2(0, 1);

export const SIDE_TO_INWARD = {
	left: new Vec2(1, 0),
	right: new Vec2(-1, 0),
	top: new Vec2(0, 1),
	bottom: new Vec2(0, -1),
} as const;

export const SIDE_TO_OUTWARD = {
	left: new Vec2(-1, 0),
	right: new Vec2(1, 0),
	top: new Vec2(0, -1),
	bottom: new Vec2(0, 1),
} as const;
