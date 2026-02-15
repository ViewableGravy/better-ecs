// packages/engine/src/core/scene/scene.ts
import type { SystemFactoryTuple } from "../register/system";
import { SCENE_BRAND, type SceneConfig, type SceneDefinition } from "./scene.types";

/**
 * Creates a scene definition with the given name and configuration.
 *
 * @example
 * ```ts
 * const MenuScene = createScene("menu")({
 *   setup(world) {
 *     const menuRoot = world.create();
 *     world.add(menuRoot, UIComponent, { type: "menu" });
 *   },
 *   teardown(world) {
 *     // Optional custom cleanup
 *   }
 * });
 * ```
 *
 * @param name - The unique name for the scene
 * @returns A function that takes scene config and returns a SceneDefinition
 */
export const createScene = <TName extends string>(name: TName) => {
  return <const TSystems extends SystemFactoryTuple = []>(
    config: SceneConfig<TSystems>,
  ): SceneDefinition<TName, TSystems> => {
    // Default teardown is a no-op function
    const defaultTeardown = () => {
      /* no-op */
    };
    const defaultSceneHook = () => {
      /* no-op */
    };

    const definition: SceneDefinition<TName, TSystems> = {
      name,
      // TypeScript cannot prove that the fallback `[]` matches the inferred
      // `TSystems` (especially when `systems` is omitted and `TSystems` defaults).
      // This cast is the minimal, contained workaround.
      systems: (config.systems ?? []) as TSystems,
      setup: config.setup,
      sceneSetup: config.sceneSetup ?? defaultSceneHook,
      teardown: config.teardown ?? defaultTeardown,
      sceneTeardown: config.sceneTeardown ?? defaultSceneHook,
      [SCENE_BRAND]: true as const,
    };

    // Notify HMR runtime so scene definitions can be hot-swapped without a full reload.
    // The cast through `unknown` is required because SceneDefinition includes a symbol key
    // ([SCENE_BRAND]) that doesn't satisfy Record<string, unknown>.
    const hmr = globalThis.__ENGINE_HMR__;
    if (hmr?.onSceneCreated) {
      hmr.onSceneCreated(definition as unknown as Record<string, unknown>);
    }

    return definition;
  };
};
