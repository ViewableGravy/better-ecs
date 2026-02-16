import {
  COLLIDER_TOGGLE_CTRL,
  COLLIDER_TOGGLE_META,
  GRID_TOGGLE_CTRL,
  GRID_TOGGLE_META,
  HOTBAR_SLOT_BOX,
  HOTBAR_SLOT_EMPTY,
} from "./const";
import type { BuildModeState } from "./state";

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

export function handleBuildModeKeybinds(state: BuildModeState, matchKeybind: MatchKeybind): void {
  if (matchKeybind(HOTBAR_SLOT_BOX)) {
    state.selectedItem = "box";
  }

  if (matchKeybind(HOTBAR_SLOT_EMPTY)) {
    state.selectedItem = null;
  }

  if (matchKeybind(GRID_TOGGLE_CTRL) || matchKeybind(GRID_TOGGLE_META)) {
    state.gridVisible = !state.gridVisible;
  }

  if (matchKeybind(COLLIDER_TOGGLE_CTRL) || matchKeybind(COLLIDER_TOGGLE_META)) {
    state.colliderDebugVisible = !state.colliderDebugVisible;
  }
}
