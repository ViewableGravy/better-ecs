import { HOUSE_INTERIOR, RenderVisibility, type RenderVisibilityRole } from "@client/components/render-visibility";
import { CollisionProfiles } from "@client/scenes/world/physics/collision-profiles";
import { Vec2, type UserWorld } from "@engine";
import { Color, Debug, Shape, Transform2D } from "@engine/components";
import { RectangleCollider } from "@libs/physics";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/

type SpawnWallOptions = {
	x: number;
	y: number;
	width: number;
	height: number;
	visible?: boolean;
	fill?: Color;
	stroke?: Color;
	strokeWidth?: number;
	zIndex?: number;
	renderOrder?: number;
	role?: RenderVisibilityRole;
	baseAlpha?: number;
};

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export function spawnWall(world: UserWorld, options: SpawnWallOptions): number {
	const entity = world.create();

	world.add(entity, new Transform2D(options.x, options.y));

	if (options.visible ?? true) {
		world.add(
			entity,
			new Shape(
				"rectangle",
				options.width,
				options.height,
				options.fill ?? new Color(0.28, 0.18, 0.12, 1),
				options.stroke ?? new Color(0.15, 0.08, 0.05, 1),
				options.strokeWidth ?? 2,
				options.zIndex ?? 4,
				options.renderOrder ?? 0,
			),
		);
		world.add(entity, new RenderVisibility(options.role ?? HOUSE_INTERIOR, options.baseAlpha ?? 1));
	}

	const halfWidth = options.width * 0.5;
	const halfHeight = options.height * 0.5;

	world.add(
		entity,
		new RectangleCollider(new Vec2(-halfWidth, -halfHeight), new Vec2(options.width, options.height)),
	);
	world.add(entity, CollisionProfiles.solid());
	world.add(entity, new Debug("wall"));

	return entity;
}
