import { CommandAllocator } from "@client/singletons/commandAllocator";
import {
    buildModeCommandStateDefault,
    type BuildModeCommandState,
} from "@client/systems/world/build-mode-command/const";
import { emitBuildModeCommands } from "@client/systems/world/build-mode/commands/utilities";
import { resolveBuildModePlacementTarget } from "@client/systems/world/build-mode/utils";
import { createSystem } from "@engine";
import { ActiveRegistry, System as ContextSystem, Engine, fromContext, Mouse } from "@engine/context";
import { ActiveCameraView } from "@engine/context-utils";
import type { BuildModeCommand } from "@libs/commands/build-mode";

export const System = createSystem("main:build-mode-command")({
  state: buildModeCommandStateDefault as BuildModeCommandState,
  system() {
    const { data: intentData } = fromContext(ContextSystem("main:build-mode-intent"));
    const { data: commandData } = fromContext(ContextSystem("main:build-mode-command"));
    const engine = fromContext(Engine);
    const mouse = fromContext(Mouse);

    const registry = fromContext(ActiveRegistry);
    const camera = fromContext(ActiveCameraView(registry));
    const worldPointer = mouse.world(camera);
    const { gridCoordinates } = resolveBuildModePlacementTarget(engine, worldPointer);
    const commands = CommandAllocator.scratch<BuildModeCommand>("main:build-mode-commands");

    commandData.commands = commands;

    emitBuildModeCommands(commands, intentData, gridCoordinates);

    intentData.pendingDelete = false;
    intentData.pendingPlace = false;
  },
});
