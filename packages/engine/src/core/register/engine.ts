import { AssetManager } from "../../asset/AssetManager";
import { inputSystem } from "../../systems/input";
import { transformSnapshotSystem } from "../../systems/transformSnapshot";
import type { RenderPipeline } from "../render-pipeline/render-pipeline";
import type { SceneDefinitionTuple, SceneName } from "../scene/scene.types";
import { EngineClass } from "./internal";
import type { EngineInitializationSystem, EngineSystem, SystemFactoryTuple } from "./system";
export { EngineClass };

/***** TYPE DEFINITIONS *****/
/** Options for createEngine */
type CreateEngineOptions<
  TSystems extends SystemFactoryTuple,
  TScenes extends SceneDefinitionTuple,
  TAssets extends Record<string, unknown>,
> = {
  systems: TSystems;
  scenes?: TScenes;
  initialScene?: SceneName<TScenes[number]>;
  initialization?: EngineInitializationSystem;
  assetLoader?: AssetManager<TAssets>;
  render?: RenderPipeline;
};

/***** COMPONENT START *****/
export function createEngine<
  const TSystems extends SystemFactoryTuple,
  const TScenes extends SceneDefinitionTuple = [],
  const TAssets extends Record<string, unknown> = Record<string, unknown>,
>(opts: CreateEngineOptions<TSystems, TScenes, TAssets>): EngineClass<TSystems, TScenes, TAssets> {
  // Create the engine instance
  const systemsRecord: Record<string, EngineSystem<any>> = {};

  // Add built-in systems
  const builtInSystems = [inputSystem, transformSnapshotSystem];
  for (const factory of builtInSystems) {
    const system = factory();
    systemsRecord[system.name] = system;
  }

  // Initialize each system by calling its factory (no engine parameter needed)
  for (const factory of opts.systems) {
    const system = factory();
    systemsRecord[system.name] = system;
  }

  // Create and return engine instance with scenes
  const scenes = opts.scenes ?? ([] as unknown as TScenes);
  const assets = opts.assetLoader ?? new AssetManager<TAssets>();
  const engine = new EngineClass<TSystems, TScenes, TAssets>(
    systemsRecord,
    scenes,
    assets,
    opts.render ?? null,
  );

  // Register with HMR runtime if present (set up by @repo/hmr Vite plugin)
  const hmr = globalThis.__ENGINE_HMR__;
  if (hmr?.register) hmr.register(systemsRecord);

  // Set initialization system if provided
  if (opts.initialization) {
    (engine as any).initializationSystem = opts.initialization;
  }

  // Set initial scene if provided (will be activated during initialize())
  if (opts.scenes?.length) {
    const firstScene = opts.scenes[0].name as unknown as SceneName<TScenes[number]> | undefined;
    const initialScene = opts.initialScene ?? firstScene;

    if (initialScene) {
      // We need to set the initial scene after the engine is created
      // This is done asynchronously during engine.initialize()
      const originalInitialize = engine.initialize.bind(engine);
      (engine as any).initialize = async function () {
        await originalInitialize();
        await engine.scene.set(initialScene);
      };
    }
  }

  // Return engine with type info for module augmentation
  return engine;
}
