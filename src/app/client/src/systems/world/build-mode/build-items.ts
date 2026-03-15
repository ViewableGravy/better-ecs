import type { ActivePlacementDragMode } from "@client/systems/world/build-mode/placement/types";
import { boxPlacementDefinition } from "@client/systems/world/build-mode/specs/box";
import { landClaimPlacementDefinition } from "@client/systems/world/build-mode/specs/land-claim";
import { transportBeltPlacementDefinition } from "@client/systems/world/build-mode/specs/transport-belt";
import { wallPlacementDefinition } from "@client/systems/world/build-mode/specs/wall";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/

export type BuildItemType = keyof typeof buildItemDefinitions;
export type BuildItemDefinition = (typeof buildItemDefinitions)[BuildItemType];

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

const buildItemDefinitions = {
  box: boxPlacementDefinition,
  "land-claim": landClaimPlacementDefinition,
  "transport-belt": transportBeltPlacementDefinition,
  wall: wallPlacementDefinition,
} as const;



// `Object.keys(...)` widens to `string[]`, so this cast preserves the concrete registry keys as the runtime id list.
export const BUILD_ITEM_TYPES = Object.keys(buildItemDefinitions) as BuildItemType[];

export function getBuildItemDefinition<TItemType extends BuildItemType>(itemType: TItemType) {
  return buildItemDefinitions[itemType];
}

export function getDragPlacementMode(itemType: BuildItemType | null): ActivePlacementDragMode | null {
  if (itemType === null) {
    return null;
  }

  const dragPlacementMode = getBuildItemDefinition(itemType).dragPlacementMode;

  return dragPlacementMode === "single" ? null : dragPlacementMode;
}

export function supportsDragPlacement(itemType: BuildItemType | null): boolean {
  return getDragPlacementMode(itemType) !== null;
}

export function usesPlacementEndSideRotation(itemType: BuildItemType | null): boolean {
  if (itemType === null) {
    return false;
  }

  return getBuildItemDefinition(itemType).rotationMode === "placement-end-side";
}