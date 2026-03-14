import type { EntityId, UserWorld } from "@engine";

import type { GhostKind } from "@client/entities/ghost/component";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/

type GhostPreviewVariant = string | null;

type CreateGhostPresetOptions<TPayload> = {
  kind: GhostKind;
  spawn: (world: UserWorld, x: number, y: number, payload?: TPayload) => EntityId;
  sync?: (world: UserWorld, ghostEntityId: EntityId, payload?: TPayload) => void;
  resolvePreviewVariant?: (payload?: TPayload) => GhostPreviewVariant;
};

export type GhostPreset<TPayload = void> = {
  kind: GhostKind;
  spawn: (world: UserWorld, x: number, y: number, payload?: TPayload) => EntityId;
  sync?: (world: UserWorld, ghostEntityId: EntityId, payload?: TPayload) => void;
  resolvePreviewVariant?: (payload?: TPayload) => GhostPreviewVariant;
};

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export function createGhostPreset<TPayload = void>(
  options: CreateGhostPresetOptions<TPayload>,
): GhostPreset<TPayload> {
  return {
    ...options,
  };
}