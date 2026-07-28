import { PlayerComponent } from "@legacy/components/player";
import { getPlayerEntityId } from "@legacy/entities/player/actions/getPlayerEntityId";
import type { Registry } from "@engine";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/

const FALLBACK_GHOST_OWNER_ID = "local-player";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export function getLocalPlayerOwnerId(registry: Registry): string {
  const playerEntityId = getPlayerEntityId(registry);
  if (playerEntityId === null) {
    return FALLBACK_GHOST_OWNER_ID;
  }

  const player = registry.require(playerEntityId, PlayerComponent);
  return player.name || FALLBACK_GHOST_OWNER_ID;
}
