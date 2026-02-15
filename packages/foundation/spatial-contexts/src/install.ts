import type { SceneContext } from "@repo/engine";
import type { ContextDefinition } from "./definition";
import { SpatialContextManager } from "./manager";

const STORE = new WeakMap<SceneContext, SpatialContextManager>();

export type InstallSpatialContextsOptions = {
  definitions?: readonly ContextDefinition[];
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

  return manager;
}

export function getManager(scene: SceneContext): SpatialContextManager | undefined {
  return STORE.get(scene);
}

export function ensureManager(scene: SceneContext): SpatialContextManager {
  const manager = getManager(scene);
  if (!manager) {
    throw new Error(
      "Spatial contexts not installed for active scene. Use createContextScene(...) or call installSpatialContexts(scene) in sceneSetup().",
    );
  }

  return manager;
}
