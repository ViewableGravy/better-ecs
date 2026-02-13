import type { UserWorld } from "@repo/engine";
import { Color, Shape, Transform2D } from "@repo/engine/components";
import { Portal, type PortalOpts } from "@repo/spatial-contexts";
import { RenderVisibility, type RenderVisibilityRole } from "../components/render-visibility";

type SpawnDoorOptions = {
  x: number;
  y: number;
  width?: number;
  height?: number;
  fill: Color;
  stroke?: Color;
  portal: PortalOpts;
  role?: RenderVisibilityRole;
  baseAlpha?: number;
};

export function spawnDoor(world: UserWorld, opts: SpawnDoorOptions): number {
  const entity = world.create();

  world.add(entity, new Transform2D(opts.x, opts.y));
  world.add(
    entity,
    new Shape(
      "rectangle",
      opts.width ?? 40,
      opts.height ?? 80,
      opts.fill,
      opts.stroke ?? new Color(0, 0, 0, 1),
      2,
      10,
      0,
    ),
  );
  world.add(entity, new Portal(opts.portal));
  world.add(entity, new RenderVisibility(opts.role ?? "outside", opts.baseAlpha ?? 1));

  return entity;
}
