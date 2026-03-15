import { PlayerComponent } from "@client/components/player";
import { getPlayerEntityId } from "@client/entities/player/actions/getPlayerEntityId";
import type { UserWorld } from "@engine";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/

type LocalPlayerOwnerWorlds = {
  focusedWorld: UserWorld;
  rootWorld: UserWorld;
  sceneWorlds: Iterable<UserWorld>;
};

const FALLBACK_GHOST_OWNER_ID = "local-player";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export function getLocalPlayerOwnerId(options: LocalPlayerOwnerWorlds): string {
  for (const world of collectUniqueWorlds(options.focusedWorld, [options.rootWorld, ...options.sceneWorlds])) {
    const playerEntityId = getPlayerEntityId(world);

    if (playerEntityId === null) {
      continue;
    }

    const player = world.require(playerEntityId, PlayerComponent);

    if (player.name) {
      return player.name;
    }
  }

  return FALLBACK_GHOST_OWNER_ID;
}

function collectUniqueWorlds(primaryWorld: UserWorld, worlds: Iterable<UserWorld>): UserWorld[] {
  const uniqueWorlds = new Set<UserWorld>([primaryWorld]);

  for (const world of worlds) {
    uniqueWorlds.add(world);
  }

  return [...uniqueWorlds];
}