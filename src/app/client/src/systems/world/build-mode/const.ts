import type { ClientCommand } from "@client/commands/types";
import type { TransportBeltSide } from "@client/entities/transport-belt/consts";
import {
    type BuildItemType,
} from "@client/systems/world/build-mode/build-items";
import type { EntityId } from "@engine";
import { Rgba } from "@engine/components";
export {
    BOX_SIZE,
    DELETE_POINT_RADIUS,
    GRID_CELL_SIZE,
    HALF_BOX_SIZE,
    TRANSPORT_BELT_COLLIDER_SIZE,
    TRANSPORT_BELT_OFFSET_X,
    TRANSPORT_BELT_OFFSET_Y
} from "@client/systems/world/build-mode/metrics";

export const GHOST_FILL = new Rgba(1, 0.1, 0.7, 0.25);
export const GHOST_STROKE = new Rgba(1, 0.35, 0.85, 0.95);
export const VALID_GHOST_TINT = new Rgba(1, 1, 1, 0.6);
export const INVALID_GHOST_FILL = new Rgba(1, 0.18, 0.18, 0.28);
export const INVALID_GHOST_STROKE = new Rgba(1, 0.45, 0.45, 0.98);
export const INVALID_GHOST_TINT = new Rgba(1, 0.45, 0.45, 0.76);
export const PLACED_FILL = new Rgba(1, 0.2, 0.8, 1);
export const PLACED_STROKE = new Rgba(1, 1, 1, 1);

export const HOTBAR_INDICATOR_ID = "build-hotbar-indicator";
export const TRANSPORT_BELT_ROTATION_END_SIDES: readonly TransportBeltSide[] = ["top", "right", "bottom", "left"];

/**********************************************************************************************************
*   STATE
**********************************************************************************************************/
export type PlacementDragAxis = "horizontal" | "vertical";

export type BuildModeState = {
  selectedItem: BuildItemType | null;
  gridVisible: boolean;
  commands: ClientCommand[];
  pendingPlace: boolean;
  pendingDelete: boolean;
  placePointerActive: boolean;
  placementEndSide: TransportBeltSide;
  ghostEntityId: EntityId | null;
  dragPlacementAxis: PlacementDragAxis | null;
  dragPlacementAnchorGridX: number | null;
  dragPlacementAnchorGridY: number | null;
  dragPlacedGridKeys: string[];
};

export const buildModeStateDefault: BuildModeState = {
  selectedItem: null,
  gridVisible: false,
  commands: [],
  pendingPlace: false,
  pendingDelete: false,
  placePointerActive: false,
  placementEndSide: "top",
  ghostEntityId: null,
  dragPlacementAxis: null,
  dragPlacementAnchorGridX: null,
  dragPlacementAnchorGridY: null,
  dragPlacedGridKeys: [],
};
