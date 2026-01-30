// packages/engine/src/core/scene/scene.ts
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
  return (config: SceneConfig): SceneDefinition<TName> => {
    // Default teardown is a no-op function
    const defaultTeardown = () => { /* no-op */ };
    
    return {
      name,
      setup: config.setup,
      teardown: config.teardown ?? defaultTeardown,
      [SCENE_BRAND]: true as const,
    };
  };
};
