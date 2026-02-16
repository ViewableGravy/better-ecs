import type { SystemFactory, StandardSchema } from "@repo/engine";
import { createDebugSystem } from "./debug-system";
import type { PhysicsOpts } from "./types";

export function createPhysics(opts: PhysicsOpts = {}) {
  const systems: SystemFactory<string, StandardSchema, Record<string, never>>[] = [];

  if (opts.debug) {
    systems.push(createDebugSystem(opts.debug));
  }

  return { systems };
}

export type { PhysicsOpts };
export { ColliderDebugProxy } from "./components/collider-debug-proxy";
