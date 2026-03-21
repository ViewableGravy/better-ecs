import { HOUSE_INTERIOR, RenderVisibility } from "@client/components/render-visibility";
import { CollisionProfiles } from "@client/scenes/world/physics/collision-profiles";
import type { UserWorld } from "@engine";
import { Debug, FillColor, Rgba, Shape, Transform2D } from "@engine/components";
import { CircleCollider } from "@libs/physics";

type SpawnTableOptions = {
  x: number;
  y: number;
  radius?: number;
};

export function spawnTable(world: UserWorld, opts: SpawnTableOptions): number {
  const radius = opts.radius ?? 24;
  const entity = world.create();
  const shape = new Shape("circle", radius * 2, radius * 2, 0, 2, 0);

  world.add(entity, new Transform2D(opts.x, opts.y));
  world.add(entity, shape);
  world.add(entity, new FillColor(new Rgba(0.55, 0.35, 0.2, 1)));
  world.add(entity, new CircleCollider(radius));
  world.add(entity, CollisionProfiles.solid());
  world.add(entity, new RenderVisibility(HOUSE_INTERIOR, 1));
  world.add(entity, new Debug("table"));

  return entity;
}
