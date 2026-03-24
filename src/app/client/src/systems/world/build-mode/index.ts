import type { ClientCommand } from "@client/commands/types";
import { CommandAllocator } from "@client/singletons/commandAllocator";
import { emitBuildModeCommands } from "@client/systems/world/build-mode/commands/utilities";
import {
    buildModeStateDefault,
    type BuildModeState,
} from "@client/systems/world/build-mode/const";
import { BuildModeDragPlacement } from "@client/systems/world/build-mode/drag-placement";
import { InputManager } from "@client/systems/world/build-mode/input";
import {
    resolveBuildModePlacementTarget,
} from "@client/systems/world/build-mode/utils";
import {
    createSystem,
} from "@engine";
import { System as ContextSystem, Engine, fromContext, Mouse } from "@engine/context";
import { ActiveCameraView } from "@engine/context-utils";
import { SpatialContexts } from "@libs/spatial-contexts";

export const System = createSystem("main:build-mode")({
  state: buildModeStateDefault as BuildModeState,
  system() {
    const { data } = fromContext(ContextSystem("main:build-mode"));
    const engine = fromContext(Engine);
    const mouse = fromContext(Mouse);

    const manager = SpatialContexts.requireManager(engine.scene.context);
    const focusedWorld = manager.focusedWorld;
    const commands = CommandAllocator.scratch<ClientCommand>("main:build-mode-commands");

    data.commands = commands;

    InputManager.match();
    BuildModeDragPlacement.syncSession(data);

    const camera = fromContext(ActiveCameraView(focusedWorld));
    const worldPointer = mouse.world(camera);
    const { gridCoordinates, placementTarget } = resolveBuildModePlacementTarget(engine, worldPointer);

    emitBuildModeCommands(commands, data, gridCoordinates, placementTarget);

    data.pendingDelete = false;
    data.pendingPlace = false;
  },
});
