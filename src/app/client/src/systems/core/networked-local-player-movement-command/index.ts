import { sendAuthoritativeCommand } from "@client/networking/runtime";
import { emitMovementCommands } from "@client/systems/core/local-player-movement-command/utilities";
import { createSystem } from "@engine";
import { System as ContextSystem, fromContext } from "@engine/context";
import type { MovementCommand } from "@libs/commands/movement";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export const System = createSystem("main:networked-local-player-movement-command")({
  system() {
    const { data: intentData } = fromContext(ContextSystem("main:local-player-movement-intent"));
    const commands: MovementCommand[] = [];

    emitMovementCommands(commands, intentData);

    for (const command of commands) {
      sendAuthoritativeCommand(command.type, command);
    }
  },
});