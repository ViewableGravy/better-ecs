import type { TransportBeltSide } from "@client/entities/transport-belt/consts";
import type { BuildItemType } from "@client/systems/world/build-mode/build-items";
import type { GridCoordinate } from "@client/systems/world/build-mode/grid-singleton";
import type { ContextId } from "@libs/spatial-contexts";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/

export type BuildModePlaceCommand = {
  type: "build-mode:place";
  itemType: BuildItemType;
  contextId: ContextId;
  gridX: GridCoordinate;
  gridY: GridCoordinate;
  placementEndSide: TransportBeltSide;
};

export type BuildModeDeleteCommand = {
  type: "build-mode:delete";
  contextId: ContextId;
  gridX: GridCoordinate;
  gridY: GridCoordinate;
};

export type ClientCommand = BuildModePlaceCommand | BuildModeDeleteCommand;