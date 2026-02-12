import type { UserWorld } from "@repo/engine";
import { Color, Shape, Transform2D } from "@repo/engine/components";
import { RenderVisibility, type RenderVisibilityRole } from "../components/render-visibility";

type SpawnBackgroundOptions = {
  width: number;
  height: number;
  color: Color;
  role?: RenderVisibilityRole;
  baseAlpha?: number;
};

export function spawnBackground(world: UserWorld, opts: SpawnBackgroundOptions): number {
  const entity = world.create();
  world.add(entity, new Transform2D(0, 0));
  world.add(
    entity,
    new Shape("rectangle", opts.width, opts.height, opts.color, null, 0, -100, -100),
  );
  world.add(entity, new RenderVisibility(opts.role ?? "outside", opts.baseAlpha ?? 1));
  return entity;
}
