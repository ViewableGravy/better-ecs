import type { EntityId, Registry } from "@engine";

export function destroyPlaceableWall(world: Registry, wallEntityId: EntityId): void {
	world.destroy(wallEntityId);
}
