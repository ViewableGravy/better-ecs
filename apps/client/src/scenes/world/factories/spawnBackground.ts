import { GridBounds } from "@/components/grid-bounds";
import type { UserWorld } from "@repo/engine";
import { Color, Debug, Shape, Transform2D } from "@repo/engine/components";
import { OUTSIDE, RenderVisibility, type RenderVisibilityRole } from "../components/render-visibility";

type SpawnBackgroundOptions = {
  width: number;
  height: number;
  color: Color;
  stroke?: Color;
  strokeWidth?: number;
  role?: RenderVisibilityRole;
  baseAlpha?: number;
  gridBounds?: boolean;
};

export function spawnBackground(world: UserWorld, opts: SpawnBackgroundOptions): number {
  const entity = world.create();
  world.add(entity, new Transform2D(0, 0));
  world.add(
    entity,
    new Shape(
      "rectangle",
      opts.width,
      opts.height,
      opts.color,
      opts.stroke ?? null,
      opts.strokeWidth ?? 0,
      -100,
      -100,
    ),
  );
  world.add(entity, new RenderVisibility(opts.role ?? OUTSIDE, opts.baseAlpha ?? 1));
  world.add(entity, new Debug("background"));

  if (opts.gridBounds) {
    world.add(entity, new GridBounds());
  }

  return entity;
}
