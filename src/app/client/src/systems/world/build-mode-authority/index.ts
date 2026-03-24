import { executeBuildModeCommands } from "@client/systems/world/build-mode-authority/utilities";
import { createSystem } from "@engine";
import { System as ContextSystem, Engine, fromContext } from "@engine/context";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export const System = createSystem("main:build-mode-authority")({
  system() {
    const { data } = fromContext(ContextSystem("main:build-mode"));
    const engine = fromContext(Engine);

    executeBuildModeCommands(engine, data.commands, data);
  },
});