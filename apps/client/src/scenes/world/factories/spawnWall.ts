import { Vec2, type UserWorld } from "@repo/engine";
import { Color, Debug, Shape, Transform2D } from "@repo/engine/components";
import { RectangleCollider } from "@repo/physics";
import { HOUSE_INTERIOR, RenderVisibility, type RenderVisibilityRole } from "../components/render-visibility";

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

export function spawnWall(world: UserWorld, opts: SpawnWallOptions): number {
  const entity = world.create();

  world.add(entity, new Transform2D(opts.x, opts.y));

  if (opts.visible ?? true) {
    world.add(
      entity,
      new Shape(
        "rectangle",
        opts.width,
        opts.height,
        opts.fill ?? new Color(0.28, 0.18, 0.12, 1),
        opts.stroke ?? new Color(0.15, 0.08, 0.05, 1),
        opts.strokeWidth ?? 2,
        opts.zIndex ?? 4,
        opts.renderOrder ?? 0,
      ),
    );
    world.add(entity, new RenderVisibility(opts.role ?? HOUSE_INTERIOR, opts.baseAlpha ?? 1));
  }

  const halfWidth = opts.width * 0.5;
  const halfHeight = opts.height * 0.5;

  world.add(
    entity,
    new RectangleCollider(new Vec2(-halfWidth, -halfHeight), new Vec2(opts.width, opts.height)),
  );
  world.add(entity, new Debug("wall"));

  return entity;
}