import type { TransportBeltSide } from "@client/entities/transport-belt/consts";
import {
    BUILD_ITEM_TYPES,
    type BuildItemType,
} from "@client/systems/world/build-mode/build-items";
import type { EntityId, KeyBind } from "@engine";
import { Color } from "@engine/components";
import z from "zod";

/**********************************************************************************************************
*   CONSTS
**********************************************************************************************************/
/**********************************************************************************************************
*   CONSTS
**********************************************************************************************************/
/**********************************************************************************************************
*   CONSTS
**********************************************************************************************************/
/**********************************************************************************************************
*   CONSTS
**********************************************************************************************************/
export {
    BOX_SIZE,
    DELETE_POINT_RADIUS,
    GRID_CELL_SIZE,
    HALF_BOX_SIZE,
    TRANSPORT_BELT_COLLIDER_SIZE,
    TRANSPORT_BELT_OFFSET_X,
    TRANSPORT_BELT_OFFSET_Y
} from "@client/systems/world/build-mode/metrics";

export const HOTBAR_SLOT_CONVEYOR_HORIZONTAL_RIGHT: KeyBind = {
  code: "Digit1",
  modifiers: {},
};

export const HOTBAR_SLOT_LAND_CLAIM: KeyBind = {
  code: "Digit3",
  modifiers: {},
};

export const HOTBAR_SLOT_WALL: KeyBind = {
  code: "Digit4",
  modifiers: {},
};

export const HOTBAR_SLOT_EMPTY: KeyBind = {
  code: "Digit2",
  modifiers: {},
};

export const ROTATE_BUILD_ITEM: KeyBind = {
  code: "KeyR",
  modifiers: {},
};

export const GRID_TOGGLE_CTRL: KeyBind = {
  code: "KeyG",
  modifiers: { alt: true },
};

export const GRID_TOGGLE_META: KeyBind = {
  code: "KeyG",
  modifiers: { meta: true },
};

export const GHOST_FILL = new Color(1, 0.1, 0.7, 0.25);
export const GHOST_STROKE = new Color(1, 0.35, 0.85, 0.95);
export const VALID_GHOST_TINT = new Color(1, 1, 1, 0.6);
export const INVALID_GHOST_FILL = new Color(1, 0.18, 0.18, 0.28);
export const INVALID_GHOST_STROKE = new Color(1, 0.45, 0.45, 0.98);
export const INVALID_GHOST_TINT = new Color(1, 0.45, 0.45, 0.76);
export const PLACED_FILL = new Color(1, 0.2, 0.8, 1);
export const PLACED_STROKE = new Color(1, 1, 1, 1);

export const HOTBAR_INDICATOR_ID = "build-hotbar-indicator";
export const TRANSPORT_BELT_ROTATION_END_SIDES: readonly TransportBeltSide[] = ["top", "right", "bottom", "left"];

/**********************************************************************************************************
*   STATE
**********************************************************************************************************/
export type PlacementDragAxis = "horizontal" | "vertical";

export type BuildModeState = {
  selectedItem: BuildItemType | null;
  gridVisible: boolean;
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

export const buildModeStateSchema = z.object({
  selectedItem: z.enum(BUILD_ITEM_TYPES).nullable(),
  gridVisible: z.boolean(),
  pendingPlace: z.boolean(),
  pendingDelete: z.boolean(),
  placePointerActive: z.boolean(),
  placementEndSide: z.enum(["top", "right", "bottom", "left"]),
  ghostEntityId: z
    .custom<EntityId>((value) => typeof value === "number" && Number.isInteger(value))
    .nullable(),
  dragPlacementAxis: z.enum(["horizontal", "vertical"]).nullable(),
  dragPlacementAnchorGridX: z.number().int().nullable(),
  dragPlacementAnchorGridY: z.number().int().nullable(),
  dragPlacedGridKeys: z.array(z.string()),
});
