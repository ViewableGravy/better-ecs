import type { GhostPreset } from "@client/entities/ghost";
import type { EntityId } from "@engine";

import {
  createPlacementCanPlace,
  type PlacementCanPlace,
  type PlacementContext,
  type PlacementDefinitionSharedOptions,
  type PlacementDragMode,
  type PlacementRotationMode,
  type PlacementSpawn,
  type PlacementStrategy,
} from "@client/systems/world/build-mode/placement/createPlacementDefinition";
import type { PlacementFootprint } from "@client/systems/world/build-mode/placement/footprint";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/

type BuildItemPlacementOptions<TPayload> = {
  footprint?: PlacementFootprint;
  strategy?: PlacementStrategy<TPayload>;
  canPlace?: PlacementCanPlace<TPayload>;
};

type BuildItemLifecycle<TPayload> = {
  commit: PlacementSpawn<TPayload>;
};

type CreateBuildItemSpecOptions<TPayload, TGhostEntityId extends EntityId> = Pick<
  PlacementDefinitionSharedOptions<TPayload, TGhostEntityId>,
  "item" | "ghost" | "dragPlacementMode" | "rotationMode" | "resolvePayload"
> & {
  placement?: BuildItemPlacementOptions<TPayload>;
  lifecycle: BuildItemLifecycle<TPayload>;
};

export type BuildItemSpec<TPayload = void, TGhostEntityId extends EntityId = EntityId> = {
  item: string;
  ghost: GhostPreset<TPayload, TGhostEntityId>;
  dragPlacementMode: PlacementDragMode;
  rotationMode: PlacementRotationMode;
  resolvePayload?: (context: PlacementContext) => TPayload | null | undefined;
  placement: BuildItemPlacementOptions<TPayload>;
  canPlace: PlacementCanPlace<TPayload>;
  lifecycle: BuildItemLifecycle<TPayload>;
};

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export function createBuildItemSpec<TPayload = void, TGhostEntityId extends EntityId = EntityId>(
  options: CreateBuildItemSpecOptions<TPayload, TGhostEntityId>,
): BuildItemSpec<TPayload, TGhostEntityId> {
  const placement = options.placement ?? {};

  return {
    item: options.item,
    ghost: options.ghost,
    dragPlacementMode: options.dragPlacementMode ?? "single",
    rotationMode: options.rotationMode ?? "none",
    resolvePayload: options.resolvePayload,
    placement,
    canPlace: createPlacementCanPlace({
      item: options.item,
      footprint: placement.footprint,
      placementStrategy: placement.strategy,
      canPlace: placement.canPlace,
    }),
    lifecycle: options.lifecycle,
  };
}