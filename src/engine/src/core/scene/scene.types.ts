// packages/engine/src/core/scene/scene.types.ts
import type { EngineOverlay } from "@engine/core/factory/types";
import type { SystemFactoryTuple } from "@engine/core/system";

/**
 * Internal symbol used to identify scene definitions.
 * Not exported to prevent external code from fabricating scene definitions.
 * @internal
 */
export const SCENE_BRAND: unique symbol = Symbol.for("@repo/engine:scene");

/**
 * Scene configuration options passed to createScene.
 */
export type SceneConfig<TSystems extends SystemFactoryTuple = SystemFactoryTuple> = {
  /** Optional scene-level systems that only run while this scene is active. */
  systems?: TSystems;

  /** Optional loading overlay that runs during scene setup/teardown transitions. */
  loading?: EngineOverlay;

  /** Called in scene context when the scene becomes active. */
  setup: () => any;

  /** Called in scene context before automatic registry cleanup. */
  teardown?: () => any;
};

/**
 * A scene definition that can be registered with the engine.
 */
export type SceneDefinition<
  TName extends string = string,
  TSystems extends SystemFactoryTuple = SystemFactoryTuple,
> = {
  /** The unique name of the scene */
  readonly name: TName;

  /** Scene-specific systems (instantiated per engine) */
  readonly systems: TSystems;

  /** Optional loading overlay for scene transitions. */
  loading: EngineOverlay | null;

  /** Set up the scene (create entities, etc.) */
  setup: () => void | Promise<void>;

  /** Tear down the scene (custom cleanup) */
  teardown: () => void | Promise<void>;

  /** Internal brand symbol for scene definitions */
  readonly [SCENE_BRAND]: true;
};

/**
 * An array of scene definitions to be registered with the engine.
 */
export type SceneDefinitionTuple = ReadonlyArray<SceneDefinition<string, SystemFactoryTuple>>;

/**
 * Extracts the name type from a scene definition.
 */
export type SceneName<TScene> =
  TScene extends SceneDefinition<infer N, infer TSystems>
    ? TSystems extends SystemFactoryTuple
      ? N
      : never
    : never;

/** Converts a tuple of scene definitions to a record of scene names to definitions. */
export type ScenesTupleToRecord<T extends SceneDefinitionTuple> = {
  [Scene in T[number] as SceneName<Scene>]: Scene;
};

/**
 * Converts a tuple of scene definitions to a union of their names.
 */
export type ScenesTupleToNames<T extends SceneDefinitionTuple> = SceneName<T[number]>;
