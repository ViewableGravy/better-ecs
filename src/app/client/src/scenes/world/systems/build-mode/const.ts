import { GridSingleton } from "@client/scenes/world/systems/build-mode/grid-singleton";
import type { EntityId, KeyBind } from "@engine";
import { Color } from "@engine/components";
import z from "zod";

/**********************************************************************************************************
*   CONSTS
**********************************************************************************************************/
export const GRID_CELL_SIZE = GridSingleton.cellSize;
export const BOX_SIZE = GRID_CELL_SIZE;
export const HALF_BOX_SIZE = GridSingleton.halfCellSize;

const TRANSPORT_BELT_ALIGNMENT_SAMPLE_X = -450;
const TRANSPORT_BELT_ALIGNMENT_SAMPLE_Y = 287;

export const TRANSPORT_BELT_OFFSET_X =
  ((TRANSPORT_BELT_ALIGNMENT_SAMPLE_X % GRID_CELL_SIZE) + GRID_CELL_SIZE) % GRID_CELL_SIZE;
export const TRANSPORT_BELT_OFFSET_Y =
  ((TRANSPORT_BELT_ALIGNMENT_SAMPLE_Y % GRID_CELL_SIZE) + GRID_CELL_SIZE) % GRID_CELL_SIZE;
export const TRANSPORT_BELT_COLLIDER_SIZE = GRID_CELL_SIZE - 2;

export const HOTBAR_SLOT_CONVEYOR_HORIZONTAL_RIGHT: KeyBind = {
  code: "Digit1",
  modifiers: {},
};

export const HOTBAR_SLOT_EMPTY: KeyBind = {
  code: "Digit2",
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
export const PLACED_FILL = new Color(1, 0.2, 0.8, 1);
export const PLACED_STROKE = new Color(1, 1, 1, 1);

export const DELETE_POINT_RADIUS = 0.001;
export const HOTBAR_INDICATOR_ID = "build-hotbar-indicator";

/**********************************************************************************************************
*   STATE
**********************************************************************************************************/
export type BuildItemType = "box" | "transport-belt-horizontal-right";

export type BuildModeState = {
  selectedItem: BuildItemType | null;
  gridVisible: boolean;
  pendingPlace: boolean;
  pendingDelete: boolean;
  ghostEntityId: EntityId | null;
};

export const buildModeStateDefault: BuildModeState = {
  selectedItem: null,
  gridVisible: false,
  pendingPlace: false,
  pendingDelete: false,
  ghostEntityId: null,
};

export const buildModeStateSchema = z.object({
  selectedItem: z.enum(["box", "transport-belt-horizontal-right"]).nullable(),
  gridVisible: z.boolean(),
  pendingPlace: z.boolean(),
  pendingDelete: z.boolean(),
  ghostEntityId: z
    .custom<EntityId>((value) => typeof value === "number" && Number.isInteger(value))
    .nullable(),
});
