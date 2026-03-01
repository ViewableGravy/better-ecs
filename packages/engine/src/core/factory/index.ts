/// <reference types="vite/client" />

import { inputSystem } from "@/systems/input";
import { transformSnapshotSystem } from "@/systems/transformSnapshot";
import { attachCanvas } from "@/ui/utilities/attach-canvas";
import { AssetManager } from "@assets/AssetManager";
import { executeWithContext } from "@core/context";
import { EngineClass } from "@core/engine";
import type { CreateEngineOptions } from "@core/factory/types";
import type { SceneDefinition, SceneDefinitionTuple, SceneName } from "@core/scene/scene.types";
import {
    executeSystemCleanup as runSystemCleanup,
    executeSystemInitialize as runSystemInitialize,
} from "@core/system";
import type { EngineSystem, SystemFactoryTuple } from "@core/system/types";
import type { EngineUiContextValue } from "../../ui/utilities/engine-context";

export function createEngine<
	TSystems extends SystemFactoryTuple,
	TScenes extends SceneDefinitionTuple = [],
	TAssets extends Record<string, unknown> = Record<string, unknown>,
	TAssetTypes extends Record<string, unknown> = Record<string, unknown>,
>(opts: CreateEngineOptions<TSystems, TScenes, TAssets, TAssetTypes>): EngineClass<TSystems, TScenes, TAssets, TAssetTypes> {
	const systemsRecord: Record<string, EngineSystem<any>> = {};

	const builtInSystems = [inputSystem, transformSnapshotSystem];
	for (const factory of builtInSystems) {
		const system = factory();
		systemsRecord[system.name] = system;
	}

	for (const factory of opts.systems) {
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
		opts.renderCulling,
		null,
		shouldBootstrapCanvasFromRoot,
	);

	if (rootElement) {
		const engineUiContextValue: EngineUiContextValue = engine;

		if (import.meta.env.DEV) {
			void import("../../ui/index.js").then((uiModule) => {
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
				executeWithContext({ engine, scene: engine.scene.context }, () => {
					runSystemInitialize(system);
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
			const originalInitialize = engine.initialize.bind(engine);
			(engine as any).initialize = async function () {
				await originalInitialize();
				await engine.scene.set(initialScene);
			};
		}
	}

	return engine;
}

export type { CreateEngineOptions } from "@core/factory/types";

