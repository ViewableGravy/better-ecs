import type { ContextId } from "@libs/spatial-contexts/context-id";
import type { Tagged } from "type-fest";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/

export type GridCoordinate = Tagged<number, "GridCoordinate">;

export type BuildModeItemType = "box" | "land-claim" | "transport-belt" | "wall";

export type BuildModePlacementEndSide = "top" | "right" | "bottom" | "left";

export type BuildModePlaceCommand = {
  type: "build-mode:place";
  itemType: BuildModeItemType;
  contextId: ContextId;
  gridX: GridCoordinate;
  gridY: GridCoordinate;
  placementEndSide: BuildModePlacementEndSide;
};

export type BuildModeDeleteCommand = {
  type: "build-mode:delete";
  contextId: ContextId;
  gridX: GridCoordinate;
  gridY: GridCoordinate;
};

export type BuildModeCommand = BuildModePlaceCommand | BuildModeDeleteCommand;