import type { UserWorld } from "@repo/engine";
import type { Class } from "type-fest";

export function destroyEntitiesWithComponent(
  worlds: readonly UserWorld[],
  componentType: Class<object>,
): void {
  for (const world of worlds) {
    for (const entityId of world.query(componentType)) {
      world.destroy(entityId);
    }
  }
}
