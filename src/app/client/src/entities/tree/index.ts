import { CollisionProfiles } from "@client/physics/collision-profiles";
import type { Registry } from "@engine";
import { Debug, FillColor, Rgba, Shape, StrokeColor, Transform2D } from "@engine/components";
import { CircleCollider } from "@libs/physics";

export function spawnTree(world: Registry, x: number, y: number): number {
  const entity = world.create();
  const radius = 26;

  world.add(entity, new Transform2D(x, y));
  world.add(entity, new Shape("circle", radius * 2, radius * 2, 0, 1, 0));
  world.add(entity, new FillColor(new Rgba(0.15, 0.55, 0.2, 1)));
  world.add(entity, new StrokeColor(new Rgba(0.08, 0.3, 0.1, 1)));
  world.add(entity, new CircleCollider(radius));
  world.add(entity, CollisionProfiles.solid());
  world.add(entity, new Debug("tree"));

  return entity;
}
