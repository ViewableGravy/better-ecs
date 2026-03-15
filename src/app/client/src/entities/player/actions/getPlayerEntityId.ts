import { PlayerComponent } from "@client/components/player";
import type { EntityId, UserWorld } from "@engine";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export function getPlayerEntityId(world: UserWorld): EntityId | null {
  const [playerEntityId] = world.query(PlayerComponent);

  return playerEntityId ?? null;
}