import { PlayerComponent } from "@client/components/player";
import type { EntityId, Registry } from "@engine";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export function getPlayerEntityId(world: Registry): EntityId | null {
  const [playerEntityId] = world.query(PlayerComponent);

  return playerEntityId ?? null;
}