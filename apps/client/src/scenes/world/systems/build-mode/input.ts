import { fromContext, System } from "@repo/engine/context";
import {
  GRID_TOGGLE_CTRL,
  GRID_TOGGLE_META,
  HOTBAR_SLOT_BOX,
  HOTBAR_SLOT_EMPTY,
} from "./const";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/
export function matchKeybinds(): void {
  const { data } = fromContext(System("main:build-mode"));
  const input = fromContext(System("engine:input"));

  if (input.matchKeybind(HOTBAR_SLOT_BOX)) {
    data.selectedItem = "box";
  }

  if (input.matchKeybind(HOTBAR_SLOT_EMPTY)) {
    data.selectedItem = null;
  }

  if (input.matchKeybind(GRID_TOGGLE_CTRL) || input.matchKeybind(GRID_TOGGLE_META)) {
    data.gridVisible = !data.gridVisible;
  }
}
