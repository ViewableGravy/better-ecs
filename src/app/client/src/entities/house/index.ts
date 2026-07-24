import type { Registry } from "@engine";
import { Debug, FillColor, Rgba, Shape, StrokeColor, Transform2D } from "@engine/components";

type SpawnHouseOptions = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export function spawnHouse(world: Registry, opts: SpawnHouseOptions): number {
  const entity = world.create();
  const shape = new Shape("rectangle", opts.width, opts.height, 6, 5, 0);

  world.add(entity, new Transform2D(opts.x, opts.y));
  world.add(entity, shape);
  world.add(entity, new FillColor(new Rgba(0.43, 0.25, 0.15, 1)));
  world.add(entity, new StrokeColor(new Rgba(0.18, 0.1, 0.07, 1)));
  world.add(entity, new Debug("house"));

  return entity;
}
