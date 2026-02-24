import type { UserWorld } from "@repo/engine";
import { Color, Debug, Shape, Transform2D } from "@repo/engine/components";
import { CircleCollider } from "@repo/physics";
import { OUTSIDE, RenderVisibility } from "../components/render-visibility";

type SpawnTreeOptions = {
  x: number;
  y: number;
  radius?: number;
};

export function spawnTree(world: UserWorld, opts: SpawnTreeOptions): number {
  const radius = opts.radius ?? 26;
  const entity = world.create();

  world.add(entity, new Transform2D(opts.x, opts.y));
  world.add(
    entity,
    new Shape("circle", radius * 2, radius * 2, new Color(0.2, 0.65, 0.25, 1), null, 0, 1, 0),
  );
  world.add(entity, new CircleCollider(radius));
  world.add(entity, new RenderVisibility(OUTSIDE, 1));
  world.add(entity, new Debug("tree"));

  return entity;
}
