import type { EntityId, UserWorld } from "@engine";

export function destroyPlaceableWall(world: UserWorld, wallEntityId: EntityId): void {
	world.destroy(wallEntityId);
}
