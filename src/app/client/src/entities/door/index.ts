import { OUTSIDE, RenderVisibility, type RenderVisibilityRole } from "@client/components/render-visibility";
import { CollisionProfiles } from "@client/scenes/world/physics/collision-profiles";
import { Vec2, type UserWorld } from "@engine";
import { Debug, FillColor, Rgba, Shape, StrokeColor, Transform2D } from "@engine/components";
import { RectangleCollider } from "@libs/physics";
import { Portal, type PortalOpts } from "@libs/spatial-contexts";

type SpawnDoorOptions = {
  x: number;
  y: number;
  width?: number;
  height?: number;
  fill: Rgba;
  stroke?: Rgba;
  portal?: PortalOpts;
  hasCollider?: boolean;
  role?: RenderVisibilityRole;
  baseAlpha?: number;
};

export function spawnDoor(world: UserWorld, opts: SpawnDoorOptions): number {
  const entity = world.create();
  const width = opts.width ?? 40;
  const height = opts.height ?? 80;
  const shape = new Shape("rectangle", width, height, 2, 10, 0);

  world.add(entity, new Transform2D(opts.x, opts.y));
  world.add(entity, shape);
  world.add(entity, new FillColor(opts.fill));
  world.add(entity, new StrokeColor(opts.stroke ?? new Rgba(0, 0, 0, 1)));

  if (opts.hasCollider ?? true) {
    const halfWidth = width * 0.5;
    const halfHeight = height * 0.5;

    world.add(
      entity,
      new RectangleCollider(new Vec2(-halfWidth, -halfHeight), new Vec2(width, height)),
    );
    world.add(entity, CollisionProfiles.solid());
  }

  if (opts.portal) {
    world.add(entity, new Portal(opts.portal));
  }

  world.add(entity, new RenderVisibility(opts.role ?? OUTSIDE, opts.baseAlpha ?? 1));
  world.add(entity, new Debug("door"));

  return entity;
}
