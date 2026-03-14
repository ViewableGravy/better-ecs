import type { RenderVisibilityRole } from "@client/components/render-visibility";
import type { BuildModeState } from "@client/systems/world/build-mode/const";
import type { GridCoordinates } from "@client/systems/world/build-mode/grid-singleton";
import type { UserWorld } from "@engine";
import type { ContextId, ContextRelationship } from "@libs/spatial-contexts";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/

export type PlacementPayloadResolver<TPayload> = (context: PlacementContext) => TPayload | null | undefined;
export type PlacementCanPlace<TPayload> = (context: PlacementContext, payload?: TPayload) => boolean;
export type PlacementSpawn<TPayload> = (context: PlacementSpawnContext, payload?: TPayload) => void;
export type PlacementDragMode = "single" | "line";
export type PlacementRotationMode = "none" | "placement-end-side";

export type PlacementContext = {
  world: UserWorld;
  inputWorld: UserWorld;
  focusedWorld: UserWorld;
  previewWorld: UserWorld;
  commitWorld: UserWorld;
  previewContextId?: ContextId;
  commitContextId?: ContextId;
  relationship?: ContextRelationship;
  gridCoordinates: GridCoordinates;
  snappedX: number;
  snappedY: number;
  buildModeState: BuildModeState;
};

export type PlacementSpawnContext = PlacementContext & {
  renderVisibilityRole: RenderVisibilityRole;
};