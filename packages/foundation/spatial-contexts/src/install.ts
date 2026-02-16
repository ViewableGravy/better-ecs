import type { SceneContext } from "@repo/engine";
import type { ContextDefinition } from "./definition";
import { SpatialContextManager } from "./manager";

export type InstallSpatialContextsOptions = {
  definitions?: readonly ContextDefinition[];
};

/**
 * Static utility class for spatial contexts installation and retrieval.
 */
export class SpatialContexts {
  private static store = new WeakMap<SceneContext, SpatialContextManager>();

  /**
   * Installs a spatial context manager for the given scene, returning it.
   * If a manager is already installed, this is a no-op that returns the existing manager. 
   * 
   * Optionally accepts context definitions to register immediately.
   */
  public static install(scene: SceneContext, opts?: InstallSpatialContextsOptions): SpatialContextManager {
    const existing = this.store.get(scene);
    if (existing) return existing;

    const manager = new SpatialContextManager(scene);

    if (opts?.definitions) {
      for (const def of opts.definitions) {
        manager.registerDefinition(def);
      }
    }

    this.store.set(scene, manager);

    return manager;
  }

  /**
   * Gets the spatial context manager for the given scene, if one is installed. 
   * Returns undefined if not.
   * 
   * @param scene The scene to get the manager for.
   * @returns The spatial context manager for the given scene, or undefined if none is installed.
   */
  public static getManager(scene: SceneContext): SpatialContextManager | undefined {
    return this.store.get(scene);
  }

  /**
   * Asserts a spatial context manager is installed for the given scene, returning it if so. 
   * 
   * @param scene The scene to get the manager for.
   * @returns The spatial context manager for the given scene.
   * @throws Error if no manager is installed for the given scene.
   */
  public static requireManager(scene: SceneContext): SpatialContextManager {
    const manager = this.getManager(scene);
    if (!manager) {
      throw new Error(
        "Spatial contexts not installed for active scene. Use createContextScene(...) or call installSpatialContexts(scene) in sceneSetup().",
      );
    }

    return manager;
  }
}