import { GridBounds } from "@client/components/grid-bounds";
import { HOUSE_INTERIOR, RenderVisibility } from "@client/components/render-visibility";
import type { UserWorld } from "@engine";
import { Debug, FillColor, Rgba, Shape, StrokeColor, Transform2D } from "@engine/components";

export function spawnDungeon(world: UserWorld): number {
  const entity = world.create();
  const shape = new Shape("rectangle", 900, 600, 6, -100, -100);

  world.add(entity, new Transform2D(0, 0));
  world.add(entity, shape);
  world.add(entity, new FillColor(new Rgba(0.08, 0.1, 0.14, 1)));
  world.add(entity, new StrokeColor(new Rgba(0.35, 0.4, 0.5, 1)));
  world.add(entity, new RenderVisibility(HOUSE_INTERIOR, 1));
  world.add(entity, new GridBounds());
  world.add(entity, new Debug("dungeon"));

  return entity;
}
