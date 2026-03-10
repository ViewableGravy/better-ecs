import type { RenderVisibilityRole } from "@client/components/render-visibility";
import type { EntityId, UserWorld } from "@engine";

import { GhostPreviewManager } from "@client/entities/ghost";
import type { BuildItemType } from "@client/systems/world/build-mode/const";
import { boxPlacementDefinition } from "@client/systems/world/build-mode/placement/box";
import type {
    PlacementContext,
    PlacementDefinition,
} from "@client/systems/world/build-mode/placement/createPlacementDefinition";
import { landClaimPlacementDefinition } from "@client/systems/world/build-mode/placement/land-claim";
import { transportBeltPlacementDefinition } from "@client/systems/world/build-mode/placement/transport-belt";

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
  box: createRegisteredPlacementDefinition(boxPlacementDefinition),
  "land-claim": createRegisteredPlacementDefinition(landClaimPlacementDefinition),
  "transport-belt": createRegisteredPlacementDefinition(transportBeltPlacementDefinition),
};

export function getPlacementDefinition(itemType: BuildItemType) {
  return placementDefinitionRegistry[itemType];
}

function createRegisteredPlacementDefinition<TPayload>(
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
        item: definition.item,
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