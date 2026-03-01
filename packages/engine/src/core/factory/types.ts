import { AssetManager } from "@assets/AssetManager";
import type { RenderPipeline } from "@core/render-pipeline";
import type { SceneDefinitionTuple, SceneName } from "@core/scene/scene.types";
import type { EngineInitializationSystem, SystemFactoryTuple } from "@core/system/types";

export type EngineRenderCullingOptions = {
	enabled?: boolean;
	viewportScaleX?: number;
	viewportScaleY?: number;
	debugOutline?: boolean;
};

export type CreateEngineOptions<
	TSystems extends SystemFactoryTuple,
	TScenes extends SceneDefinitionTuple,
	TAssets extends Record<string, unknown>,
	TAssetTypes extends Record<string, unknown> = Record<string, unknown>,
> = {
	rootElement?: HTMLElement | null;
	systems: TSystems;
	scenes?: TScenes;
	initialScene?: SceneName<TScenes[number]>;
	initialization?: EngineInitializationSystem;
	assetLoader?: AssetManager<TAssets, TAssetTypes>;
	render?: RenderPipeline;
	renderCulling?: EngineRenderCullingOptions;
};

