import { Engine, fromContext } from "@engine/context";
import type { SystemFactory } from "@engine/core/system";
import { createSystem } from "@engine/core/system";
import { AuthoritativeNetworkRuntime } from "@repo/networking/server/AuthoritativeNetworkRuntime";

const DEFAULT_PRIORITY = -100_000;
const DEFAULT_SYSTEM_NAME = "sync:networking:server";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export function createAuthoritativeNetworkingSystem<const TName extends string = typeof DEFAULT_SYSTEM_NAME>(options: {
  runtime: AuthoritativeNetworkRuntime;
  name?: TName;
  priority?: number;
}): SystemFactory<TName, Record<string, never>, Record<string, never>> {
  const name = options.name ?? (DEFAULT_SYSTEM_NAME as TName);

  return createSystem(name)({
    priority: options.priority ?? DEFAULT_PRIORITY,
    initialize() {
      return options.runtime.attachEngine(fromContext(Engine));
    },
    system() {
      const engine = fromContext(Engine);
      const commands = engine.serialization.drainDiffCommands();
      if (commands.length === 0) {
        return;
      }

      return options.runtime.publishDiffCommands(commands);
    },
  });
}