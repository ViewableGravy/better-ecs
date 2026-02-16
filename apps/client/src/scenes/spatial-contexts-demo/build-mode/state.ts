import type { EntityId } from "@repo/engine";

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

export const buildModeState: BuildModeState = {
  selectedItem: null,
  gridVisible: true,
  colliderDebugVisible: false,
  mouseScreenX: 0,
  mouseScreenY: 0,
  pendingPlace: false,
  pendingDelete: false,
  ghostEntityId: null,
};
