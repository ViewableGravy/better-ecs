import type { RenderVisibilityRole } from "@client/components/render-visibility";
import type { EntityId, UserWorld } from "@engine";

import { GhostPreviewManager } from "@client/entities/ghost";
import {
  getBuildItemDefinition,
  type BuildItemType,
} from "@client/systems/world/build-mode/build-items";
import type {
  PlacementContext,
} from "@client/systems/world/build-mode/placement/createPlacementDefinition";
import type { BuildItemSpec } from "@client/systems/world/build-mode/placement/spec";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/

export type RegisteredResolvedPlacement = {
  intent: {
    item: BuildItemType;
    context: PlacementContext;
    payload?: unknown;
  };
  canPlace: boolean;
  preview: {
    world: UserWorld;
    sync: (ghostEntityId: EntityId | null) => EntityId;
  };
  commit: {
    world: UserWorld;
    execute: (renderVisibilityRole: RenderVisibilityRole) => void;
  };
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
  definition: BuildItemSpec<TPayload, EntityId>,
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
        intent: {
          item: itemType,
          context,
          payload,
        },
        canPlace,
        preview: {
          world: context.previewWorld,
          sync(ghostEntityId) {
            return GhostPreviewManager.sync(
              context.previewWorld,
              ghostEntityId,
              context.snappedX,
              context.snappedY,
              definition.ghost,
              payload,
              canPlace,
            );
          },
        },
        commit: {
          world: context.commitWorld,
          execute(renderVisibilityRole) {
            definition.lifecycle.commit({ ...context, renderVisibilityRole }, payload);
          },
        },
      };
    },
  };
}