import { CollisionProfiles } from "@legacy/scenes/world/physics/collision-profiles";
import type { Registry } from "@engine";
import { Debug, FillColor, Rgba, Shape, Transform2D } from "@engine/components";
import { CircleCollider } from "@libs/physics";

type SpawnTreeOptions = {
  x: number;
  y: number;
  radius?: number;
};

export function spawnTree(world: Registry, opts: SpawnTreeOptions): number {
  const radius = opts.radius ?? 26;
  const entity = world.create();
  const shape = new Shape("circle", radius * 2, radius * 2, 0, 1, 0);

  world.add(entity, new Transform2D(opts.x, opts.y));
  world.add(entity, shape);
  world.add(entity, new FillColor(new Rgba(0.2, 0.65, 0.25, 1)));
  world.add(entity, new CircleCollider(radius));
  world.add(entity, CollisionProfiles.solid());
  world.add(entity, new Debug("tree"));

  return entity;
}
