import type { EntityId } from "@repo/engine";
import z from "zod";

export type BuildItemType = "box";

export type BuildModeState = {
  selectedItem: BuildItemType | null;
  gridVisible: boolean;
  colliderDebugVisible: boolean;
  mouseScreenX: number;
  mouseScreenY: number;
  pendingPlace: boolean;
  pendingDelete: boolean;
  ghostEntityId: EntityId | null;
};

export const buildModeStateDefault: BuildModeState = {
  selectedItem: null,
  gridVisible: true,
  colliderDebugVisible: false,
  mouseScreenX: 0,
  mouseScreenY: 0,
  pendingPlace: false,
  pendingDelete: false,
  ghostEntityId: null,
};

export const buildModeStateSchema = z.object({
  selectedItem: z.literal("box").nullable(),
  gridVisible: z.boolean(),
  colliderDebugVisible: z.boolean(),
  mouseScreenX: z.number(),
  mouseScreenY: z.number(),
  pendingPlace: z.boolean(),
  pendingDelete: z.boolean(),
  ghostEntityId: z
    .custom<EntityId>((value) => typeof value === "number" && Number.isInteger(value))
    .nullable(),
});
