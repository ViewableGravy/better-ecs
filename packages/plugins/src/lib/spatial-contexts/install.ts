import type { SceneContext } from "@repo/engine";
import type { ContextId } from "./context-id";
import type { ContextDefinition } from "./definition";
import { SpatialContextManager } from "./manager";

const STORE = new WeakMap<SceneContext, SpatialContextManager>();

export type InstallSpatialContextsOptions = {
  definitions?: readonly ContextDefinition[];
  focusedContextId?: ContextId;
};

export function installSpatialContexts(
  scene: SceneContext,
  opts?: InstallSpatialContextsOptions,
): SpatialContextManager {
  const existing = STORE.get(scene);
  if (existing) return existing;

  const manager = new SpatialContextManager(scene);

  if (opts?.definitions) {
    for (const def of opts.definitions) {
      manager.registerDefinition(def);
    }
  }

  STORE.set(scene, manager);

  if (opts?.focusedContextId) {
    // Fire-and-forget; v1 is synchronous unless a setup returns a promise.
    void manager.setFocusedContextId(opts.focusedContextId);
  }

  return manager;
}

export function getSpatialContextManager(scene: SceneContext): SpatialContextManager | undefined {
  return STORE.get(scene);
}
