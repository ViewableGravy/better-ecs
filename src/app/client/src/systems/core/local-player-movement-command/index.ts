import { CommandAllocator } from "@client/singletons/commandAllocator";
import {
    localPlayerMovementCommandStateDefault,
    type LocalPlayerMovementCommandState,
} from "@client/systems/core/local-player-movement-command/const";
import { emitMovementCommands } from "@client/systems/core/local-player-movement-command/utilities";
import { createSystem } from "@engine";
import { System as ContextSystem, fromContext } from "@engine/context";
import type { MovementCommand } from "@libs/commands/movement";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export const System = createSystem("main:local-player-movement-command")({
  state: localPlayerMovementCommandStateDefault as LocalPlayerMovementCommandState,
  system() {
    const { data: intentData } = fromContext(ContextSystem("main:local-player-movement-intent"));
    const { data: commandData } = fromContext(ContextSystem("main:local-player-movement-command"));
    const commands = CommandAllocator.scratch<MovementCommand>("main:local-player-movement-commands");

    commandData.commands = commands;

    emitMovementCommands(commands, intentData);
  },
});