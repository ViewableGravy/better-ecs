import type { TransportBeltVariant } from "@client/entities/transport-belt";
import { GhostUtils } from "@client/entities/ghost/utils";
import type { EntityId, UserWorld } from "@engine";

import type { GhostKind } from "@client/entities/ghost/component";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/

type GhostSpawner<TEntityId extends EntityId = EntityId> = () => TEntityId;

type GhostVariant = TransportBeltVariant | null;

export type GhostPreset<TPayload = void, TEntityId extends EntityId = EntityId> = {
  kind: GhostKind;
  spawn: (world: UserWorld, x: number, y: number, payload?: TPayload) => TEntityId;
  sync?: (world: UserWorld, ghostEntityId: TEntityId, payload?: TPayload) => void;
};

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export function spawnGhost<TEntityId extends EntityId>(
  world: UserWorld,
  spawn: GhostSpawner<TEntityId>,
  kind: GhostKind = "box",
  variant: GhostVariant = null,
): TEntityId {
  return GhostUtils.applyEffect(world, spawn(), kind, variant);
}