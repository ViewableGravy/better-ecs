import type { UserWorld } from "@repo/engine";
import type { Class } from "type-fest";

export function destroyEntitiesWithComponent(
  worlds: Iterable<UserWorld>,
  componentType: Class<object>,
): void {
  for (const world of worlds) {
    destroyEntitiesWithComponentInWorld(world, componentType);
  }
}

export function destroyEntitiesWithComponentInWorld(
  world: UserWorld,
  componentType: Class<object>,
): void {
  for (const entityId of world.query(componentType)) {
    world.destroy(entityId);
  }
}
