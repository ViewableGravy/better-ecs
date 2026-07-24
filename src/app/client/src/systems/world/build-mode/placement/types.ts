import type { BuildModeState } from "@client/systems/world/build-mode/const";
import type { GridCoordinates } from "@client/systems/world/build-mode/grid-singleton";
import type { Registry } from "@engine";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/

export type PlacementPayloadResolver<TPayload> = (context: PlacementContext) => TPayload | null | undefined;
export type PlacementCanPlace<TPayload> = (context: PlacementContext, payload?: TPayload) => boolean;
export type PlacementSpawn<TPayload> = (context: PlacementSpawnContext, payload?: TPayload) => void;
export type ActivePlacementDragMode = "line" | "paint";
export type PlacementDragMode = "single" | ActivePlacementDragMode;
export type PlacementRotationMode = "none" | "placement-end-side";

export type PlacementContext = {
  world: Registry;
  inputWorld: Registry;
  focusedWorld: Registry;
  previewWorld: Registry;
  commitWorld: Registry;
  gridCoordinates: GridCoordinates;
  snappedX: number;
  snappedY: number;
  buildModeState: BuildModeState;
};

export type PlacementSpawnContext = PlacementContext;
