import type { UserWorld } from "@repo/engine";
import { Color, Debug, Shape, Transform2D } from "@repo/engine/components";
import { CircleCollider } from "@repo/physics";
import { HOUSE_INTERIOR, RenderVisibility } from "../components/render-visibility";

type SpawnChairOptions = {
  x: number;
  y: number;
  radius?: number;
};

export function spawnChair(world: UserWorld, opts: SpawnChairOptions): number {
  const radius = opts.radius ?? 14;
  const entity = world.create();

  world.add(entity, new Transform2D(opts.x, opts.y));
  world.add(
    entity,
    new Shape("circle", radius * 2, radius * 2, new Color(0.78, 0.63, 0.46, 1), null, 0, 3, 0),
  );
  world.add(entity, new CircleCollider(radius));
  world.add(entity, new RenderVisibility(HOUSE_INTERIOR, 1));
  world.add(entity, new Debug("chair"));

  return entity;
}
