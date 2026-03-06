import { AssetManager } from "@engine/asset/AssetManager";
import type { RenderPipeline } from "@engine/core/render-pipeline";
import type { SceneDefinitionTuple, SceneName } from "@engine/core/scene/scene.types";
import type { EngineInitializationSystem, SystemFactoryTuple } from "@engine/core/system/types";

export interface EngineOverlay {
	begin(): void | Promise<void>;
	end(): void | Promise<void>;
	dispose(): void | Promise<void>;
}

export type EngineRenderCullingOptions = {
	enabled?: boolean;
	viewportScaleX?: number;
	viewportScaleY?: number;
	debugOutline?: boolean;
};

export type EngineConfigOptions = {
	render?: {
		culling?: EngineRenderCullingOptions;
	};
};

export type CreateEngineOptions<
	TSystems extends SystemFactoryTuple,
	TScenes extends SceneDefinitionTuple,
	TAssets extends Record<string, unknown>,
	TAssetTypes extends Record<string, unknown> = Record<string, unknown>,
> = {
	rootElement?: HTMLElement | null;
	systems?: TSystems;
	scenes?: TScenes;
	initialScene?: SceneName<TScenes[number]>;
	initialization?: EngineInitializationSystem;
	assetLoader?: AssetManager<TAssets, TAssetTypes>;
	render?: RenderPipeline;
	loading?: EngineOverlay;
	config?: EngineConfigOptions;
};

