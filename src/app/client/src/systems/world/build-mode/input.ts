import {
    GRID_TOGGLE_CTRL,
    GRID_TOGGLE_META,
    HOTBAR_SLOT_CONVEYOR_HORIZONTAL_RIGHT,
    HOTBAR_SLOT_EMPTY,
    HOTBAR_SLOT_LAND_CLAIM,
    ROTATE_BUILD_ITEM,
    TRANSPORT_BELT_ROTATION_END_SIDES,
} from "@client/systems/world/build-mode/const";
import { fromContext, System } from "@engine/context";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/
export function matchKeybinds(): void {
  const { data } = fromContext(System("main:build-mode"));
  const input = fromContext(System("engine:input"));

  if (input.matchKeybind(HOTBAR_SLOT_CONVEYOR_HORIZONTAL_RIGHT)) {
    data.selectedItem = "transport-belt";
    data.placementEndSide = "top";
  }

  if (input.matchKeybind(HOTBAR_SLOT_LAND_CLAIM)) {
    data.selectedItem = "land-claim";
  }

  if (input.matchKeybind(HOTBAR_SLOT_EMPTY)) {
    data.selectedItem = null;
  }

  if (data.selectedItem === "transport-belt" && input.matchKeybind(ROTATE_BUILD_ITEM)) {
    const currentIndex = TRANSPORT_BELT_ROTATION_END_SIDES.indexOf(data.placementEndSide);
    const nextIndex = (currentIndex + 1) % TRANSPORT_BELT_ROTATION_END_SIDES.length;

    data.placementEndSide = TRANSPORT_BELT_ROTATION_END_SIDES[nextIndex];
  }

  if (input.matchKeybind(GRID_TOGGLE_CTRL) || input.matchKeybind(GRID_TOGGLE_META)) {
    data.gridVisible = !data.gridVisible;
  }
}
