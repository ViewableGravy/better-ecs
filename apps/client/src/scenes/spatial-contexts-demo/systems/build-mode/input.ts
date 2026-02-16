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
 *   TYPE DEFINITIONS
 **********************************************************************************************************/

type MatchKeybindModifiers = {
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
};

type MatchKeybindArgs = {
  code: string;
  modifiers: MatchKeybindModifiers;
};

type MatchKeybind = (bind: MatchKeybindArgs) => boolean;

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export function handleBuildModeKeybinds(matchKeybind: MatchKeybind): void {
  const { data } = useSystem("demo:build-mode");

  if (matchKeybind(HOTBAR_SLOT_BOX)) {
    data.selectedItem = "box";
  }

  if (matchKeybind(HOTBAR_SLOT_EMPTY)) {
    data.selectedItem = null;
  }

  if (matchKeybind(GRID_TOGGLE_CTRL) || matchKeybind(GRID_TOGGLE_META)) {
    data.gridVisible = !data.gridVisible;
  }

  if (matchKeybind(COLLIDER_TOGGLE_CTRL) || matchKeybind(COLLIDER_TOGGLE_META)) {
    data.colliderDebugVisible = !data.colliderDebugVisible;
  }
}
