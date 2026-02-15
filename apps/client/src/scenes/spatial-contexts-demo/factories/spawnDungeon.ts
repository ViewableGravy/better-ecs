import { GridBounds } from "@/components/grid-bounds";
import type { UserWorld } from "@repo/engine";
import { Color, Shape, Transform2D } from "@repo/engine/components";
import { RenderVisibility } from "../components/render-visibility";

export function spawnDungeon(world: UserWorld): number {
  const entity = world.create();

  world.add(entity, new Transform2D(0, 0));
  world.add(
    entity,
    new Shape(
      "rectangle",
      900,
      600,
      new Color(0.08, 0.1, 0.14, 1),
      new Color(0.35, 0.4, 0.5, 1),
      6,
      -100,
      -100,
    ),
  );
  world.add(entity, new RenderVisibility("house-interior", 1));
  world.add(entity, new GridBounds());

  return entity;
}
