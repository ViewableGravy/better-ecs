// packages/engine/src/core/scene/scene.types.ts
import type { UserWorld } from "../../ecs/world";
import type { SystemFactoryTuple } from "../register/system";
import type { SceneContext } from "./scene-context";

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
  /** Optional scene-level systems that only run while this scene is active. */
  systems?: SystemFactoryTuple;

  /**
   * Called when the scene becomes active. Use this to create entities and set up the scene.
   * @param world - The scene's world instance
   */
  setup: (world: UserWorld) => void | Promise<void>;

  /**
   * Called when the scene becomes active with access to the scene context.
   * Use this to register additional worlds, scene-wide state, etc.
   */
  sceneSetup?: (scene: SceneContext) => void | Promise<void>;

  /**
   * Called when the scene is being deactivated. Use this for any custom cleanup.
   * Note: Entity cleanup is handled automatically by the engine.
   * @param world - The scene's world instance
   */
  teardown?: (world: UserWorld) => void | Promise<void>;

  /**
   * Called when the scene is being deactivated with access to the scene context.
   * Use this to cleanup scene-wide state and additional worlds.
   */
  sceneTeardown?: (scene: SceneContext) => void | Promise<void>;
};

/**
 * A scene definition that can be registered with the engine.
 */
export type SceneDefinition<TName extends string = string> = {
  /** The unique name of the scene */
  readonly name: TName;

  /** Scene-specific systems (instantiated per engine) */
  readonly systems: SystemFactoryTuple;

  /** Set up the scene (create entities, etc.) */
  setup: (world: UserWorld) => void | Promise<void>;

  /** Optional scene-level setup */
  sceneSetup: (scene: SceneContext) => void | Promise<void>;

  /** Tear down the scene (custom cleanup) */
  teardown: (world: UserWorld) => void | Promise<void>;

  /** Optional scene-level teardown */
  sceneTeardown: (scene: SceneContext) => void | Promise<void>;

  /** Internal brand symbol for scene definitions */
  readonly [SCENE_BRAND]: true;
};

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
