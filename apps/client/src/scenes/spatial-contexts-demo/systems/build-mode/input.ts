import { useSystem } from "@repo/engine";
import {
  COLLIDER_TOGGLE_CTRL,
  COLLIDER_TOGGLE_META,
  GRID_TOGGLE_CTRL,
  GRID_TOGGLE_META,
  HOTBAR_SLOT_BOX,
  HOTBAR_SLOT_EMPTY,
} from "./const";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/
export function matchKeybinds(): void {
  const { data } = useSystem("demo:build-mode");
  const input = useSystem("engine:input");

  if (input.matchKeybind(HOTBAR_SLOT_BOX)) {
    data.selectedItem = "box";
  }

  if (input.matchKeybind(HOTBAR_SLOT_EMPTY)) {
    data.selectedItem = null;
  }

  if (input.matchKeybind(GRID_TOGGLE_CTRL) || input.matchKeybind(GRID_TOGGLE_META)) {
    data.gridVisible = !data.gridVisible;
  }

  if (input.matchKeybind(COLLIDER_TOGGLE_CTRL) || input.matchKeybind(COLLIDER_TOGGLE_META)) {
    data.colliderDebugVisible = !data.colliderDebugVisible;
  }
}
