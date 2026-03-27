import { createSystem } from "@engine";
import { System as ContextSystem, fromContext } from "@engine/context";
import { MOVEMENT_COMMAND_SYSTEM_NAME } from "@server/scenes/demo/systems/movement-command";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export const System = createSystem("server:local-player-movement-command-reset")({
  priority: -100_000,
  system() {
    const { data } = fromContext(ContextSystem(MOVEMENT_COMMAND_SYSTEM_NAME));
    data.commands = [];
  },
});