import { fromContext, System } from "@engine/context";
import {
  HOTBAR_SLOT_CONVEYOR_HORIZONTAL_RIGHT,
  GRID_TOGGLE_CTRL,
  GRID_TOGGLE_META,
  HOTBAR_SLOT_EMPTY,
} from "@client/systems/world/build-mode/const";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/
export function matchKeybinds(): void {
  const { data } = fromContext(System("main:build-mode"));
  const input = fromContext(System("engine:input"));

  if (input.matchKeybind(HOTBAR_SLOT_CONVEYOR_HORIZONTAL_RIGHT)) {
    data.selectedItem = "transport-belt-horizontal-right";
  }

  if (input.matchKeybind(HOTBAR_SLOT_EMPTY)) {
    data.selectedItem = null;
  }

  if (input.matchKeybind(GRID_TOGGLE_CTRL) || input.matchKeybind(GRID_TOGGLE_META)) {
    data.gridVisible = !data.gridVisible;
  }
}
