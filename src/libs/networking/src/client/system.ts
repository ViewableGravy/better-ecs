import { Engine, fromContext } from "@engine/context";
import type { SystemFactory } from "@engine/core/system";
import { createSystem } from "@engine/core/system";
import { ReplicatedClientRuntime } from "@repo/networking/client/ReplicatedClientRuntime";

const DEFAULT_PRIORITY = -100_000;
const DEFAULT_SYSTEM_NAME = "sync:networking:client";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export function createReplicatedNetworkingSystem<const TName extends string = typeof DEFAULT_SYSTEM_NAME>(options: {
  runtime: ReplicatedClientRuntime;
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
      return options.runtime.flush();
    },
  });
}