import type { SystemFactoryTuple } from "@repo/engine";
import { createDebugSystem } from "./debug-system";
import type { PhysicsOpts } from "./types";

export function createPhysics(opts: PhysicsOpts = {}) {
  const systems: SystemFactoryTuple = [];

  if (opts.debug) {
    systems.push(createDebugSystem(opts.debug));
  }

  return { systems };
}

export { ColliderDebugProxy } from "./components/collider-debug-proxy";
export type { PhysicsOpts };

