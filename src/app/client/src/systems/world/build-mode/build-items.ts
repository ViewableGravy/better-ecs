import { boxPlacementDefinition } from "@client/systems/world/build-mode/placement/box";
import { landClaimPlacementDefinition } from "@client/systems/world/build-mode/placement/land-claim";
import { transportBeltPlacementDefinition } from "@client/systems/world/build-mode/placement/transport-belt";
import { wallPlacementDefinition } from "@client/systems/world/build-mode/placement/wall";

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

export function supportsLineDragPlacement(itemType: BuildItemType | null): boolean {
  if (itemType === null) {
    return false;
  }

  return getBuildItemDefinition(itemType).dragPlacementMode === "line";
}

export function usesPlacementEndSideRotation(itemType: BuildItemType | null): boolean {
  if (itemType === null) {
    return false;
  }

  return getBuildItemDefinition(itemType).rotationMode === "placement-end-side";
}