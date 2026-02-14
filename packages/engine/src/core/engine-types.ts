import { SceneManager } from ".";
import { AssetManager } from "../asset";
import type { RenderPipeline } from "./render-pipeline/render-pipeline";

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
};

export type RegisteredEngine<TRegister = Register> = TRegister extends {
  Engine: infer TEngine extends AnyEngine;
}
  ? TEngine
  : AnyEngine;

/**
 * Helper type to get all available system names including both user-defined
 * and built-in engine systems.
 */
export type AllSystemNames<TRegister = Register> = keyof RegisteredEngine<TRegister>["systems"];

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
