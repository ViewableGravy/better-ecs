import type { SystemFactoryTuple } from "@engine";
import { createDebugSystem } from "@lib/physics/plugin/debug-system";
import type { PhysicsOpts } from "@lib/physics/plugin/types";

export function createPhysics(opts: PhysicsOpts = {}) {
  const systems: SystemFactoryTuple = [];

  if (opts.debug) {
    systems.push(createDebugSystem(opts.debug));
  }

  return { systems };
}

export { ColliderDebugProxy } from "@lib/physics/plugin/components/collider-debug-proxy";
export type { PhysicsOpts };

