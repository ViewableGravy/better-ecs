import { CommandAllocator } from "@client/singletons/commandAllocator";
import {
    buildModeCommandStateDefault,
    type BuildModeCommandState,
} from "@client/systems/world/build-mode-command/const";
import { emitBuildModeCommands } from "@client/systems/world/build-mode/commands/utilities";
import { resolveBuildModePlacementTarget } from "@client/systems/world/build-mode/utils";
import { createSystem } from "@engine";
import { System as ContextSystem, Engine, fromContext, Mouse } from "@engine/context";
import { ActiveCameraView } from "@engine/context-utils";
import type { BuildModeCommand } from "@libs/commands/build-mode";
import { SpatialContexts } from "@libs/spatial-contexts";

export const System = createSystem("main:build-mode-command")({
  state: buildModeCommandStateDefault as BuildModeCommandState,
  system() {
    const { data: intentData } = fromContext(ContextSystem("main:build-mode-intent"));
    const { data: commandData } = fromContext(ContextSystem("main:build-mode-command"));
    const engine = fromContext(Engine);
    const mouse = fromContext(Mouse);

    const manager = SpatialContexts.requireManager(engine.scene.context);
    const focusedWorld = manager.focusedWorld;
    const camera = fromContext(ActiveCameraView(focusedWorld));
    const worldPointer = mouse.world(camera);
    const { gridCoordinates, placementTarget } = resolveBuildModePlacementTarget(engine, worldPointer);
    const commands = CommandAllocator.scratch<BuildModeCommand>("main:build-mode-commands");

    commandData.commands = commands;

    emitBuildModeCommands(commands, intentData, gridCoordinates, placementTarget);

    intentData.pendingDelete = false;
    intentData.pendingPlace = false;
  },
});