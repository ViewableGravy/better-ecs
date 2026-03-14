import type { PlacementFootprint } from "@client/systems/world/build-mode/placement/footprint";
import type { PlacementPreviewAdapter } from "@client/systems/world/build-mode/placement/preview";
import {
    createPlacementCanPlace,
    createPlacementEvaluator,
    type PlacementEvaluator,
    type PlacementStrategy,
} from "@client/systems/world/build-mode/placement/rules";
import type {
    PlacementCanPlace,
    PlacementContext,
    PlacementDragMode,
    PlacementPayloadResolver,
    PlacementRotationMode,
    PlacementSpawn,
} from "@client/systems/world/build-mode/placement/types";

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

type CreateBuildItemSpecOptions<TPayload> = {
  item: string;
  dragPlacementMode?: PlacementDragMode;
  rotationMode?: PlacementRotationMode;
  resolvePayload?: PlacementPayloadResolver<TPayload>;
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
  evaluatePlacement: PlacementEvaluator<TPayload>;
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
  const evaluatePlacement = createPlacementEvaluator({
    item: options.item,
    footprint: placement.footprint,
    placementStrategy: placement.strategy,
    canPlace: placement.canPlace,
  });

  return {
    item: options.item,
    preview: options.preview,
    dragPlacementMode: options.dragPlacementMode ?? "single",
    rotationMode: options.rotationMode ?? "none",
    resolvePayload: options.resolvePayload,
    placement,
    evaluatePlacement,
    canPlace: createPlacementCanPlace({
      item: options.item,
      footprint: placement.footprint,
      placementStrategy: placement.strategy,
      canPlace: placement.canPlace,
    }, evaluatePlacement),
    lifecycle: options.lifecycle,
  };
}