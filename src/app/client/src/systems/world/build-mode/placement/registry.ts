import type { EntityId, Registry } from "@engine";

import {
    getBuildItemDefinition,
    type BuildItemType,
} from "@client/systems/world/build-mode/build-items";
import type {
    PlacementEvaluation,
} from "@client/systems/world/build-mode/placement/rules";
import type { BuildItemSpec } from "@client/systems/world/build-mode/placement/spec";
import type {
    PlacementContext,
} from "@client/systems/world/build-mode/placement/types";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/

export type RegisteredResolvedPlacement = {
  intent: {
    item: BuildItemType;
    context: PlacementContext;
    payload?: unknown;
  };
  evaluation: PlacementEvaluation<unknown>;
  canPlace: boolean;
  preview: {
    world: Registry;
    sync: (ghostEntityId: EntityId | null, ownerId: string) => EntityId;
  };
  commit: {
    world: Registry;
    execute: () => void;
  };
};

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export function canPlaceRegisteredPlacement(
  itemType: BuildItemType,
  context: PlacementContext,
): boolean {
  const resolvedPlacement = resolveRegisteredPlacement(itemType, context);

  return resolvedPlacement?.canPlace ?? false;
}

export function resolveRegisteredPlacement(itemType: BuildItemType, context: PlacementContext): RegisteredResolvedPlacement | null {
  switch (itemType) {
    case "box":
      return createRegisteredResolvedPlacement(itemType, getBuildItemDefinition(itemType), context);
    case "land-claim":
      return createRegisteredResolvedPlacement(itemType, getBuildItemDefinition(itemType), context);
    case "transport-belt":
      return createRegisteredResolvedPlacement(itemType, getBuildItemDefinition(itemType), context);
    case "wall":
      return createRegisteredResolvedPlacement(itemType, getBuildItemDefinition(itemType), context);
  }
}

function createRegisteredResolvedPlacement<TPayload>(
  itemType: BuildItemType,
  definition: BuildItemSpec<TPayload>,
  context: PlacementContext,
): RegisteredResolvedPlacement | null {
  const payload = definition.resolvePayload?.(context);

  if (payload === null) {
    return null;
  }

  const evaluation = definition.evaluatePlacement(context, payload);
  const canPlace = evaluation.canPlace;

  return {
    intent: {
      item: itemType,
      context,
      payload,
    },
    evaluation,
    canPlace,
    preview: {
      world: context.previewWorld,
      sync(ghostEntityId, ownerId) {
        return definition.preview.sync(
          {
            context,
            canPlace,
          },
          ghostEntityId,
          ownerId,
          payload,
        );
      },
    },
    commit: {
      world: context.commitWorld,
      execute() {
        definition.lifecycle.commit(context, payload);
      },
    },
  };
}
