import { SceneManager } from ".";
import { AssetManager } from "../asset";
import type { inputSystem } from "../systems/input";
import type { transformSnapshotSystem } from "../systems/transformSnapshot";
import type { EngineClass } from "./register/internal";
import type { EngineSystem, SystemFactory, SystemFactoryTuple } from "./register/system";
import type { RenderPipeline } from "./render-pipeline";
import type { SceneDefinition, SceneDefinitionTuple } from "./scene/scene.types";
import type { InferStandardSchema, StandardSchema } from "./types";

// --- Type Registration (via module augmentation) ---
// eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-empty-interface
export interface Register {
  // Engine: EngineTypeInfo<...>
}

export type AnyEngine = {
  systems: Record<string, any>;
  world: any;
  frame: any;
  /**
   * Record of scene names to scene definitions.
   * This is a computed property from SceneManager.
   */
  scenes: Record<string, any>;
  /** Scene manager for controlling scene lifecycle */
  scene: SceneManager<any>;
  assets: AssetManager<any>;
  render: RenderPipeline | null;
  canvas: HTMLCanvasElement | null;
};

export type RegisteredEngine<TRegister = Register> = TRegister extends {
  Engine: infer TEngine extends AnyEngine;
}
  ? TEngine
  : AnyEngine;

type AnySystemFactory = {
  (): unknown;
  ["~types"]: {
    name: string;
    schema: StandardSchema;
  };
};

type SceneSystemFactories<TScenes extends SceneDefinitionTuple> =
  TScenes[number] extends SceneDefinition<string, infer TSceneSystems extends SystemFactoryTuple>
    ? TSceneSystems[number]
    : never;

type ExtractSystemByName<TSystems extends AnySystemFactory, TName extends string> =
  TSystems extends { ["~types"]: { name: TName } } ? TSystems : never;

type InferLiteralSystemName<TName extends string> = string extends TName ? never : TName;

/**
 * Built-in system factories that are always present on every engine.
 */
export type EngineSystems = typeof inputSystem | typeof transformSnapshotSystem;

/**
 * Userland system factories registered via `createEngine({ systems })`
 * and scene definitions.
 */
export type UserlandSystems<TEngine extends AnyEngine = RegisteredEngine> =
  TEngine extends EngineClass<
    infer TSystems extends SystemFactoryTuple,
    infer TScenes extends SceneDefinitionTuple,
    Record<string, unknown>
  >
    ? TSystems[number] | SceneSystemFactories<TScenes>
    : never;

/**
 * Union of all system factories available on an engine.
 */
export type Systems<TEngine extends AnyEngine = RegisteredEngine> =
  UserlandSystems<TEngine> | EngineSystems;

/**
 * Name literal for a SystemFactory.
 */
export type InferSystemName<TSystem extends AnySystemFactory> =
  TSystem extends { ["~types"]: { name: infer TName extends string } }
    ? InferLiteralSystemName<TName>
    : never;

/**
 * Schema type for a SystemFactory.
 */
export type InferSystemSchema<TSystem extends AnySystemFactory> = TSystem["~types"]["schema"];

/**
 * Data type inferred from a system's Standard Schema output.
 */
export type InferSystemData<TSystem extends AnySystemFactory> =
  InferStandardSchema<InferSystemSchema<TSystem>>["output"];

/**
 * Methods attached to the system by the factory `methods` option.
 */
export type InferSystemMethods<TSystem extends AnySystemFactory> =
  TSystem extends SystemFactory<string, infer TSchema extends StandardSchema, infer TMethods>
    ? TMethods
    : TSystem extends { (): infer TResult }
      ? Omit<TResult, keyof EngineSystem<TSystem["~types"]["schema"]>>
      : never;

/**
 * Engine runtime system type returned by invoking a system factory.
 */
export type InferEngineSystem<TSystem extends AnySystemFactory> =
  TSystem extends (...args: never[]) => infer TEngineSystem
    ? TEngineSystem extends EngineSystem
      ? TEngineSystem
      : never
    : never;

/** Built-in engine system names (e.g. `engine:input`). */
export type EngineSystemNames = InferSystemName<EngineSystems>;

/** Userland system names (global + scene systems). */
export type UserlandSystemNames<TEngine extends AnyEngine = RegisteredEngine> =
  InferSystemName<UserlandSystems<TEngine>>;

/**
 * Union of all available system names.
 */
export type SystemNames<TEngine extends AnyEngine = RegisteredEngine> =
  | Extract<keyof TEngine["systems"], string>
  | EngineSystemNames
  | UserlandSystemNames<TEngine>;

/** Built-in engine system factory by name. */
export type EngineSystemFactory<TName extends string> = ExtractSystemByName<EngineSystems, TName>;

/** Userland system factory by name. */
export type UserlandSystem<TName extends string, TEngine extends AnyEngine = RegisteredEngine> =
  ExtractSystemByName<UserlandSystems<TEngine>, TName>;

/** Any system factory by name (engine + userland). */
export type System<TName extends string, TEngine extends AnyEngine = RegisteredEngine> =
  ExtractSystemByName<Systems<TEngine>, TName>;

/** Data inferred from a userland system. */
export type UserlandSystemData<TSystem extends UserlandSystems = UserlandSystems> =
  InferSystemData<TSystem>;

/** Data inferred from a built-in engine system. */
export type EngineSystemData<TSystem extends EngineSystems = EngineSystems> = InferSystemData<TSystem>;

/** Methods inferred from a userland system. */
export type UserlandSystemMethods<TSystem extends UserlandSystems = UserlandSystems> =
  InferSystemMethods<TSystem>;

/** Methods inferred from a built-in engine system. */
export type EngineSystemMethods<TSystem extends EngineSystems = EngineSystems> =
  InferSystemMethods<TSystem>;

/** Runtime engine-system shape for a userland system. */
export type UserlandEngineSystem<TSystem extends UserlandSystems = UserlandSystems> =
  InferEngineSystem<TSystem>;

/** Runtime engine-system shape for a built-in engine system. */
export type EngineEngineSystem<TSystem extends EngineSystems = EngineSystems> = InferEngineSystem<TSystem>;

/** Runtime record of registered systems available via `engine.systems`. */
export type RegisteredSystems<TEngine extends AnyEngine = RegisteredEngine> = TEngine["systems"];

/**
 * Helper type to get all available system names including both user-defined
 * and built-in engine systems.
 */
export type AllSystemNames<TRegister = Register> =
  SystemNames<RegisteredEngine<TRegister>>;

/**
 * Helper type to get all available scene names from the registered engine.
 * Extracts the keys (scene names) from the scenes record.
 */
export type AllSceneNames<TRegister = Register> = keyof RegisteredEngine<TRegister>["scenes"];

/**
 * Helper type to get the registered asset manager from the engine.
 */
export type RegisteredAssetManager<TRegister = Register> = RegisteredEngine<TRegister>["assets"];

/**
 * Helper type to get the user world type from the registered engine.
 */
export type RegisteredAssets<TRegister = Register> =
  RegisteredAssetManager<TRegister> extends AssetManager<infer TAssets> ? TAssets : never;
