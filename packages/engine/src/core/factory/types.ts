import { AssetManager } from "../../asset/AssetManager";
import type { RenderPipeline } from "../render-pipeline";
import type { SceneDefinitionTuple, SceneName } from "../scene/scene.types";
import type { EngineInitializationSystem, SystemFactoryTuple } from "../system/types";

export type CreateEngineOptions<
	TSystems extends SystemFactoryTuple,
	TScenes extends SceneDefinitionTuple,
	TAssets extends Record<string, unknown>,
> = {
	rootElement?: HTMLElement | null;
	systems: TSystems;
	scenes?: TScenes;
	initialScene?: SceneName<TScenes[number]>;
	initialization?: EngineInitializationSystem;
	assetLoader?: AssetManager<TAssets>;
	render?: RenderPipeline;
};

