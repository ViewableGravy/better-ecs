import type { RenderVisibilityRole } from "@client/components/render-visibility";
import type { EntityId, UserWorld } from "@engine";

import { GhostPreviewManager } from "@client/entities/ghost";
import {
  getBuildItemDefinition,
  type BuildItemType,
} from "@client/systems/world/build-mode/build-items";
import type {
    PlacementContext,
    PlacementDefinition,
} from "@client/systems/world/build-mode/placement/createPlacementDefinition";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/

export type RegisteredResolvedPlacement = {
  item: BuildItemType;
  canPlace: boolean;
  spawn: (renderVisibilityRole: RenderVisibilityRole) => void;
  syncGhost: (world: UserWorld, ghostEntityId: EntityId | null) => EntityId;
};

type RegisteredPlacementDefinition = {
  canPlace: (context: PlacementContext) => boolean;
  resolveSelection: (context: PlacementContext) => RegisteredResolvedPlacement | null;
};

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

const placementDefinitionRegistry = {
  box: createRegisteredPlacementDefinition("box", getBuildItemDefinition("box")),
  "land-claim": createRegisteredPlacementDefinition("land-claim", getBuildItemDefinition("land-claim")),
  "transport-belt": createRegisteredPlacementDefinition("transport-belt", getBuildItemDefinition("transport-belt")),
};

export function getPlacementDefinition(itemType: BuildItemType) {
  return placementDefinitionRegistry[itemType];
}

function createRegisteredPlacementDefinition<TPayload>(
  itemType: BuildItemType,
  definition: PlacementDefinition<TPayload, EntityId>,
): RegisteredPlacementDefinition {
  return {
    canPlace(context) {
      const payload = definition.resolvePayload?.(context);

      if (payload === null) {
        return false;
      }

      return definition.canPlace(context, payload);
    },
    resolveSelection(context) {
      const payload = definition.resolvePayload?.(context);

      if (payload === null) {
        return null;
      }

      const canPlace = definition.canPlace(context, payload);

      return {
        item: itemType,
        canPlace,
        spawn(renderVisibilityRole) {
          definition.spawn({ ...context, renderVisibilityRole }, payload);
        },
        syncGhost(world, ghostEntityId) {
          return GhostPreviewManager.sync(
            world,
            ghostEntityId,
            context.snappedX,
            context.snappedY,
            definition.ghost,
            payload,
            canPlace,
          );
        },
      };
    },
  };
}