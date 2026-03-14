import { usesPlacementEndSideRotation } from "@client/systems/world/build-mode/build-items";
import {
    TRANSPORT_BELT_ROTATION_END_SIDES
} from "@client/systems/world/build-mode/const";
import { createKeybind } from "@engine";
import { fromContext, System } from "@engine/context";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/
export class InputManager {

  private static selectLandClaim = createKeybind("Digit3");

  private static selectWall = createKeybind("Digit4");

  private static selectEmpty = createKeybind("Digit2");

  private static selectBelt = createKeybind("Digit1");

  private static rotateBuildItem = createKeybind("KeyR");

  private static toggleGridAlt = createKeybind({
    code: "KeyG",
    modifiers: { alt: true },
  });

  private static toggleGridMeta = createKeybind({
    code: "KeyG",
    modifiers: { meta: true },
  });

  /**
   * Checks for relevant keybinds and updates build mode stat accordingly.
   */
  public static match(): void {
    const { data } = fromContext(System("main:build-mode"));
    const input = fromContext(System("engine:input"));

    if (input.matchKeybind(InputManager.selectBelt)) {
      data.selectedItem = "transport-belt";
      data.placementEndSide = "top";
    }

    if (input.matchKeybind(InputManager.selectLandClaim)) {
      data.selectedItem = "land-claim";
    }

    if (input.matchKeybind(InputManager.selectWall)) {
      data.selectedItem = "wall";
    }

    if (input.matchKeybind(InputManager.selectEmpty)) {
      data.selectedItem = null;
    }

    if (usesPlacementEndSideRotation(data.selectedItem) && input.matchKeybind(InputManager.rotateBuildItem)) {
      const currentIndex = TRANSPORT_BELT_ROTATION_END_SIDES.indexOf(data.placementEndSide);
      const nextIndex = (currentIndex + 1) % TRANSPORT_BELT_ROTATION_END_SIDES.length;

      data.placementEndSide = TRANSPORT_BELT_ROTATION_END_SIDES[nextIndex];
    }

    if (input.matchKeybind(InputManager.toggleGridAlt) || input.matchKeybind(InputManager.toggleGridMeta)) {
      data.gridVisible = !data.gridVisible;
    }
  }
}
