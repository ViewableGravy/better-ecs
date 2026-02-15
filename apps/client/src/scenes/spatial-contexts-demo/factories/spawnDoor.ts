import { Vec2, type UserWorld } from "@repo/engine";
import { Color, Shape, Transform2D } from "@repo/engine/components";
import { RectangleCollider } from "@repo/physics";
import { Portal, type PortalOpts } from "@repo/spatial-contexts";
import { RenderVisibility, type RenderVisibilityRole } from "../components/render-visibility";

type SpawnDoorOptions = {
  x: number;
  y: number;
  width?: number;
  height?: number;
  fill: Color;
  stroke?: Color;
  portal?: PortalOpts;
  hasCollider?: boolean;
  role?: RenderVisibilityRole;
  baseAlpha?: number;
};

export function spawnDoor(world: UserWorld, opts: SpawnDoorOptions): number {
  const entity = world.create();
  const width = opts.width ?? 40;
  const height = opts.height ?? 80;

  world.add(entity, new Transform2D(opts.x, opts.y));
  world.add(
    entity,
    new Shape(
      "rectangle",
      width,
      height,
      opts.fill,
      opts.stroke ?? new Color(0, 0, 0, 1),
      2,
      10,
      0,
    ),
  );

  if (opts.hasCollider ?? true) {
    const halfWidth = width * 0.5;
    const halfHeight = height * 0.5;

    world.add(
      entity,
      new RectangleCollider(new Vec2(-halfWidth, -halfHeight), new Vec2(width, height)),
    );
  }

  if (opts.portal) {
    world.add(entity, new Portal(opts.portal));
  }

  world.add(entity, new RenderVisibility(opts.role ?? "outside", opts.baseAlpha ?? 1));

  return entity;
}
