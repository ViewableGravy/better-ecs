import type { UserWorld } from "@repo/engine";
import { Color, Shape, Transform2D } from "@repo/engine/components";
import { CircleCollider } from "@repo/physics";
import { RenderVisibility } from "../components/render-visibility";

type SpawnTableOptions = {
  x: number;
  y: number;
  radius?: number;
};

export function spawnTable(world: UserWorld, opts: SpawnTableOptions): number {
  const radius = opts.radius ?? 24;
  const entity = world.create();

  world.add(entity, new Transform2D(opts.x, opts.y));
  world.add(
    entity,
    new Shape("circle", radius * 2, radius * 2, new Color(0.55, 0.35, 0.2, 1), null, 0, 2, 0),
  );
  world.add(entity, new CircleCollider(radius));
  world.add(entity, new RenderVisibility("house-interior", 1));

  return entity;
}
