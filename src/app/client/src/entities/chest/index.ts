import { CollisionProfiles } from "@client/physics/collision-profiles";
import type { EntityId, Registry } from "@engine";
import { Rectangle, Vec2 } from "@engine";
import { Debug, Sprite, Transform2D } from "@engine/components";
import { RectangleCollider } from "@libs/physics";

const CHEST_WIDTH = 32;
const CHEST_HEIGHT = 36;

/** Spawn a wooden Factorio chest with a collider matching its rendered bounds. */
export function spawnChest(world: Registry, x: number, y: number): EntityId {
  const entity = world.create();

  world.add(entity, new Transform2D(x, y));
  world.add(entity, new Sprite("wooden-chest:wooden", CHEST_WIDTH, CHEST_HEIGHT));
  world.add(
    entity,
    new RectangleCollider(
      new Rectangle(new Vec2(-CHEST_WIDTH / 2, -CHEST_HEIGHT / 2), new Vec2(CHEST_WIDTH, CHEST_HEIGHT)),
    ),
  );
  world.add(entity, CollisionProfiles.solid());
  world.add(entity, new Debug("wooden chest"));

  return entity;
}
