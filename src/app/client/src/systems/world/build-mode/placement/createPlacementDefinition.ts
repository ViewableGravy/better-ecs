import type { RenderVisibilityRole } from "@client/components/render-visibility";
import type { GhostPreset } from "@client/entities/ghost";
import { LandClaimQuery } from "@client/entities/land-claim";
import type {
    BuildItemType,
    BuildModeState,
} from "@client/systems/world/build-mode/const";
import type { GridCoordinates } from "@client/systems/world/build-mode/grid-singleton";
import type { EntityId, UserWorld } from "@engine";

import { PlacementQueries } from "@client/systems/world/build-mode/placement/queries";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/

type PlacementPayloadResolver<TPayload> = (context: PlacementContext) => TPayload | null | undefined;
type PlacementCanPlace<TPayload> = (context: PlacementContext, payload?: TPayload) => boolean;
type PlacementSpawn<TPayload> = (context: PlacementSpawnContext, payload?: TPayload) => void;

type CreatePlacementDefinitionOptions<TPayload, TGhostEntityId extends EntityId> = {
  item: BuildItemType;
  ghost: GhostPreset<TPayload, TGhostEntityId>;
  resolvePayload?: PlacementPayloadResolver<TPayload>;
  canPlace?: PlacementCanPlace<TPayload>;
  spawn: PlacementSpawn<TPayload>;
};

export type PlacementContext = {
  world: UserWorld;
  gridCoordinates: GridCoordinates;
  snappedX: number;
  snappedY: number;
  buildModeState: BuildModeState;
};

export type PlacementSpawnContext = PlacementContext & {
  renderVisibilityRole: RenderVisibilityRole;
};

export type PlacementDefinition<TPayload = void, TGhostEntityId extends EntityId = EntityId> = {
  item: BuildItemType;
  ghost: GhostPreset<TPayload, TGhostEntityId>;
  resolvePayload?: PlacementPayloadResolver<TPayload>;
  canPlace: PlacementCanPlace<TPayload>;
  spawn: PlacementSpawn<TPayload>;
};

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export function createPlacementDefinition<TPayload = void, TGhostEntityId extends EntityId = EntityId>(
  definition: CreatePlacementDefinitionOptions<TPayload, TGhostEntityId>,
): PlacementDefinition<TPayload, TGhostEntityId> {
  const canPlace: PlacementCanPlace<TPayload> = definition.canPlace ?? (({ world, gridCoordinates }) => {
    if (definition.item !== "land-claim" && !LandClaimQuery.isWithinBuildableArea(world, gridCoordinates)) {
      return false;
    }

    return PlacementQueries.queryFirstPlacementOverlap(world, gridCoordinates) === undefined;
  });

  return {
    ...definition,
    canPlace,
  };
}
