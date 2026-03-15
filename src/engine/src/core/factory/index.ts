/// <reference types="vite/client" />

import { AssetManager } from "@engine/asset/AssetManager";
import { executeWithContext } from "@engine/core/context";
import { EngineClass } from "@engine/core/engine";
import type { CreateEngineOptions } from "@engine/core/factory/types";
import { registerEngine } from "@engine/core/global-engine";
import type { SceneDefinition, SceneDefinitionTuple, SceneName } from "@engine/core/scene/scene.types";
import {
    executeSystemCleanup as runSystemCleanup,
    executeSystemInitialize as runSystemInitialize,
} from "@engine/core/system";
import type { EngineSystem, SystemFactoryTuple } from "@engine/core/system/types";
import { inputSystem } from "@engine/systems/input";
import { transformSnapshotSystem } from "@engine/systems/transformSnapshot";
import { attachCanvas } from "@engine/ui/utilities/attach-canvas";
import type { EngineUiContextValue } from "@engine/ui/utilities/engine-context";

export function createEngine<
	TSystems extends SystemFactoryTuple = [],
	TScenes extends SceneDefinitionTuple = [],
	TAssets extends Record<string, unknown> = Record<string, unknown>,
	TAssetTypes extends Record<string, unknown> = Record<string, unknown>,
>(opts: CreateEngineOptions<TSystems, TScenes, TAssets, TAssetTypes>): EngineClass<TSystems, TScenes, TAssets, TAssetTypes> {
	const systemsRecord: Record<string, EngineSystem<any>> = {};
	const systems = opts.systems ?? ([] as unknown as TSystems);

	const builtInSystems = [inputSystem, transformSnapshotSystem];
	for (const factory of builtInSystems) {
		const system = factory();
		systemsRecord[system.name] = system;
	}

	for (const factory of systems) {
		const system = factory();
		systemsRecord[system.name] = system;
	}

	const scenes = opts.scenes ?? ([] as unknown as TScenes);
	const assets = opts.assetLoader ?? new AssetManager<TAssets, TAssetTypes>();
	const rootElement = opts.rootElement ?? null;
	const shouldBootstrapCanvasFromRoot = rootElement !== null;

	const engine = new EngineClass<TSystems, TScenes, TAssets, TAssetTypes>(
		systemsRecord,
		scenes,
		assets,
		opts.render ?? null,
		opts.loading,
		opts.config?.render?.culling,
		opts.config?.serialization,
		null,
		shouldBootstrapCanvasFromRoot,
	);

	if (!opts.manualRegisterEngine) {
		registerEngine(engine);
	}

	if (rootElement) {
		const engineUiContextValue: EngineUiContextValue = engine;

		if (import.meta.env.DEV) {
			void import("@engine/ui/index").then((uiModule) => {
				uiModule.mountEngineEditorUi({
					rootElement,
					engine: engineUiContextValue,
				});
			});
		} else {
			const attached = attachCanvas(rootElement, {
				onCanvasReady: (canvas) => {
					engine.setCanvas(canvas);
				},
			});

			engine.setCanvas(attached.canvas);
		}
	}

	const hmr = globalThis.__ENGINE_HMR__;
	if (hmr) {
		const allHmrSystems: Record<string, EngineSystem<any>> = { ...systemsRecord };
		for (const system of engine.getAllSceneSystems()) {
			allHmrSystems[system.name] = system;
		}

		hmr.register?.(allHmrSystems);

		hmr.registerCallbacks?.({
			executeSystemCleanup(system) {
				executeWithContext({ engine, scene: engine.scene.context }, () => {
					runSystemCleanup(system);
				});
			},
			executeSystemInitialize(system) {
					void executeWithContext({ engine, scene: engine.scene.context }, async () => {
						await runSystemInitialize(system);
					});
			},
			async reloadActiveScene() {
				await engine.scene.reload();
			},
			updateSceneDefinition(scene) {
				return engine.scene.updateDefinition(scene as unknown as SceneDefinition<string>);
			},
		});
	}

	if (opts.initialization) {
		engine.setInitializationSystem(opts.initialization);
	}

	if (opts.scenes?.length) {
		const firstScene = opts.scenes[0].name as unknown as SceneName<TScenes[number]> | undefined;
		const initialScene = opts.initialScene ?? firstScene;

		if (initialScene) {
			engine.setInitialScene(initialScene);
		}
	}

	return engine;
}

export type {
    CreateEngineOptions,
    EngineOverlay
} from "@engine/core/factory/types";

