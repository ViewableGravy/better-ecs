import { GhostUtils } from "@client/entities/ghost/utils";
import type { EntityId, UserWorld } from "@engine";

import type { GhostKind } from "@client/entities/ghost/component";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/

type GhostSpawner<TEntityId extends EntityId = EntityId> = () => TEntityId;
type GhostPreviewVariant = string | null;

type CreateEntityGhostPresetOptions<TPayload> = {
  kind: GhostKind;
  spawn: (world: UserWorld, x: number, y: number, payload?: TPayload) => EntityId;
  sync?: (world: UserWorld, ghostEntityId: EntityId, payload?: TPayload) => void;
  resolvePreviewVariant?: (payload?: TPayload) => GhostPreviewVariant;
};

export type GhostPreset<TPayload = void> = {
  kind: GhostKind;
  spawn: (world: UserWorld, x: number, y: number, payload?: TPayload) => EntityId;
  sync?: (world: UserWorld, ghostEntityId: EntityId, payload?: TPayload) => void;
};

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export function spawnGhost<TEntityId extends EntityId>(
  world: UserWorld,
  spawn: GhostSpawner<TEntityId>,
  kind: GhostKind = "box",
  previewVariant: GhostPreviewVariant = null,
): TEntityId {
  return GhostUtils.applyEffect(world, spawn(), kind, previewVariant);
}

export function createEntityGhostPreset<TPayload = void>(
  options: CreateEntityGhostPresetOptions<TPayload>,
): GhostPreset<TPayload> {
  return {
    kind: options.kind,
    spawn(world, x, y, payload) {
      const ghostEntityId = options.spawn(world, x, y, payload);
      const previewVariant = options.resolvePreviewVariant?.(payload) ?? null;

      return GhostUtils.applyEffect(world, ghostEntityId, options.kind, previewVariant);
    },
    sync: options.sync,
  };
}