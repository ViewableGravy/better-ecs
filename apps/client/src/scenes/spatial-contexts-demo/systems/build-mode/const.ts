import type { EntityId, KeyBind } from "@repo/engine";
import { Color } from "@repo/engine/components";
import z from "zod";

/**********************************************************************************************************
*   CONSTS
**********************************************************************************************************/
export const GRID_CELL_SIZE = 20;
export const BOX_SIZE = GRID_CELL_SIZE;
export const HALF_BOX_SIZE = BOX_SIZE / 2;

export const HOTBAR_SLOT_BOX: KeyBind = {
  code: "Digit1",
  modifiers: {},
};

export const HOTBAR_SLOT_EMPTY: KeyBind = {
  code: "Digit2",
  modifiers: {},
};

export const GRID_TOGGLE_CTRL: KeyBind = {
  code: "KeyG",
  modifiers: { ctrl: true },
};

export const GRID_TOGGLE_META: KeyBind = {
  code: "KeyG",
  modifiers: { meta: true },
};

export const COLLIDER_TOGGLE_CTRL: KeyBind = {
  code: "KeyH",
  modifiers: { ctrl: true },
};

export const COLLIDER_TOGGLE_META: KeyBind = {
  code: "KeyH",
  modifiers: { meta: true },
};

export const GRID_OR_COLLIDER_CODES = new Set(["KeyG", "KeyH"]);

export const GHOST_FILL = new Color(1, 0.1, 0.7, 0.25);
export const GHOST_STROKE = new Color(1, 0.35, 0.85, 0.95);
export const PLACED_FILL = new Color(1, 0.2, 0.8, 1);
export const PLACED_STROKE = new Color(1, 1, 1, 1);

export const COLLIDER_DEBUG_STYLE = {
  fill: new Color(0, 0, 0, 0),
  stroke: new Color(0.2, 1, 0.8, 1),
  strokeWidth: 1,
};

export const DELETE_POINT_RADIUS = 0.001;
export const HOTBAR_INDICATOR_ID = "build-hotbar-indicator";

/**********************************************************************************************************
*   STATE
**********************************************************************************************************/
export type BuildItemType = "box";

export type BuildModeState = {
  selectedItem: BuildItemType | null;
  gridVisible: boolean;
  colliderDebugVisible: boolean;
  pendingPlace: boolean;
  pendingDelete: boolean;
  ghostEntityId: EntityId | null;
};

export const buildModeStateDefault: BuildModeState = {
  selectedItem: null,
  gridVisible: true,
  colliderDebugVisible: false,
  pendingPlace: false,
  pendingDelete: false,
  ghostEntityId: null,
};

export const buildModeStateSchema = z.object({
  selectedItem: z.literal("box").nullable(),
  gridVisible: z.boolean(),
  colliderDebugVisible: z.boolean(),
  pendingPlace: z.boolean(),
  pendingDelete: z.boolean(),
  ghostEntityId: z
    .custom<EntityId>((value) => typeof value === "number" && Number.isInteger(value))
    .nullable(),
});
