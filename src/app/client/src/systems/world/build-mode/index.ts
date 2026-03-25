import {
    buildModeStateDefault,
    type BuildModeState,
} from "@client/systems/world/build-mode/const";
import { BuildModeDragPlacement } from "@client/systems/world/build-mode/drag-placement";
import { InputManager } from "@client/systems/world/build-mode/input";
import {
    createSystem,
} from "@engine";
import { System as ContextSystem, fromContext } from "@engine/context";

export const System = createSystem("main:build-mode-intent")({
  state: buildModeStateDefault as BuildModeState,
  system() {
    const { data } = fromContext(ContextSystem("main:build-mode-intent"));

    InputManager.match();
    BuildModeDragPlacement.syncSession(data);
  },
});
