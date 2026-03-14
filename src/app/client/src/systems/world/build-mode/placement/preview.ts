import { GhostPreviewManager } from "@client/entities/ghost";
import type { GhostPreset } from "@client/entities/ghost/spawner";
import type { EntityId } from "@engine";

import type { PlacementContext } from "@client/systems/world/build-mode/placement/types";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/

type PlacementPreviewSyncOptions = {
  context: PlacementContext;
  canPlace: boolean;
};

export type PlacementPreviewAdapter<TPayload = void> = {
  sync: (
    options: PlacementPreviewSyncOptions,
    ghostEntityId: EntityId | null,
    payload?: TPayload,
  ) => EntityId;
};

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export function createGhostPreviewAdapter<TPayload = void>(
  preset: GhostPreset<TPayload>,
): PlacementPreviewAdapter<TPayload> {
  return {
    sync({ context, canPlace }, ghostEntityId, payload) {
      return GhostPreviewManager.sync(
        context.previewWorld,
        ghostEntityId,
        context.snappedX,
        context.snappedY,
        preset,
        payload,
        canPlace,
      );
    },
  };
}