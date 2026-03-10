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
import type { PlacementPreviewAdapter } from "@client/systems/world/build-mode/placement/preview";

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

type CreateBuildItemSpecOptions<TPayload> = Pick<
  PlacementDefinitionSharedOptions<TPayload>,
  "item" | "dragPlacementMode" | "rotationMode" | "resolvePayload"
> & {
  preview: PlacementPreviewAdapter<TPayload>;
  placement?: BuildItemPlacementOptions<TPayload>;
  lifecycle: BuildItemLifecycle<TPayload>;
};

export type BuildItemSpec<TPayload = void> = {
  item: string;
  preview: PlacementPreviewAdapter<TPayload>;
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

export function createBuildItemSpec<TPayload = void>(
  options: CreateBuildItemSpecOptions<TPayload>,
): BuildItemSpec<TPayload> {
  const placement = options.placement ?? {};

  return {
    item: options.item,
    preview: options.preview,
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