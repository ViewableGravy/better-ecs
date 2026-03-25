import { executeBuildModeCommands } from "@client/systems/world/build-mode-authority/utilities";
import { createSystem } from "@engine";
import { System as ContextSystem, Engine, fromContext } from "@engine/context";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export const System = createSystem("main:build-mode-authority")({
  system() {
    const { data: intentData } = fromContext(ContextSystem("main:build-mode-intent"));
    const { data: commandData } = fromContext(ContextSystem("main:build-mode-command"));
    const engine = fromContext(Engine);

    executeBuildModeCommands(engine, commandData.commands, intentData);
  },
});