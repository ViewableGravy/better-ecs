import type { UserWorld } from "@repo/engine";
import { Color, Shape, Transform2D } from "@repo/engine/components";
import { RenderVisibility } from "../components/render-visibility";

type SpawnHouseOptions = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export function spawnHouse(world: UserWorld, opts: SpawnHouseOptions): number {
  const entity = world.create();

  world.add(entity, new Transform2D(opts.x, opts.y));
  world.add(
    entity,
    new Shape(
      "rectangle",
      opts.width,
      opts.height,
      new Color(0.43, 0.25, 0.15, 1),
      new Color(0.18, 0.1, 0.07, 1),
      6,
      5,
      0,
    ),
  );
  world.add(entity, new RenderVisibility("house-roof", 1));

  return entity;
}
