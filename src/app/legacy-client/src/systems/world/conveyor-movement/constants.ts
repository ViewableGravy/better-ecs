import { Vec2 } from "@engine";
import { Transform2D } from "@engine/components";
import { COLLISION_LAYERS } from "@libs/physics";

export const BELT_QUERY_FILTER = {
	category: COLLISION_LAYERS.QUERY,
	mask: COLLISION_LAYERS.CONVEYOR,
};

export const SHARED_MOTION = new Vec2(0, 0);
export const SHARED_PLAYER_WORLD_TRANSFORM = new Transform2D();
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
