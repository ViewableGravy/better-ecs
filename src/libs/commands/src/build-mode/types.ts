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
  gridX: GridCoordinate;
  gridY: GridCoordinate;
  placementEndSide: BuildModePlacementEndSide;
};

export type BuildModeDeleteCommand = {
  type: "build-mode:delete";
  gridX: GridCoordinate;
  gridY: GridCoordinate;
};

export type BuildModeCommand = BuildModePlaceCommand | BuildModeDeleteCommand;
