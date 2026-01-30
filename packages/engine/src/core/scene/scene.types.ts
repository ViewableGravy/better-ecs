// packages/engine/src/core/scene/scene.types.ts
import type { UserWorld } from "../../ecs/world";

/**
 * Internal symbol used to identify scene definitions.
 * Not exported to prevent external code from fabricating scene definitions.
 * @internal
 */
export const SCENE_BRAND: unique symbol = Symbol.for("@repo/engine:scene");

/**
 * Scene configuration options passed to createScene.
 */
export type SceneConfig = {
  /**
   * Called when the scene becomes active. Use this to create entities and set up the scene.
   * @param world - The scene's world instance
   */
  setup: (world: UserWorld) => void | Promise<void>;
  
  /**
   * Called when the scene is being deactivated. Use this for any custom cleanup.
   * Note: Entity cleanup is handled automatically by the engine.
   * @param world - The scene's world instance
   */
  teardown?: (world: UserWorld) => void | Promise<void>;
}

/**
 * A scene definition that can be registered with the engine.
 */
export type SceneDefinition<TName extends string = string> = {
  /** The unique name of the scene */
  readonly name: TName;
  
  /** Set up the scene (create entities, etc.) */
  setup: (world: UserWorld) => void | Promise<void>;
  
  /** Tear down the scene (custom cleanup) */
  teardown: (world: UserWorld) => void | Promise<void>;
  
  /** Internal brand symbol for scene definitions */
  readonly [SCENE_BRAND]: true;
}

/**
 * An array of scene definitions to be registered with the engine.
 */
export type SceneDefinitionTuple = ReadonlyArray<SceneDefinition<string>>;

/**
 * Extracts the name type from a scene definition.
 */
export type SceneName<TScene> = TScene extends SceneDefinition<infer N> ? N : never;

/**
 * Converts a tuple of scene definitions to a union of their names.
 */
export type ScenesTupleToNames<T extends SceneDefinitionTuple> = SceneName<T[number]>;
