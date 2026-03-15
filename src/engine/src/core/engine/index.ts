import { AssetManager } from "@engine/asset/AssetManager";
import { CanvasManager } from "@engine/core/canvas";
import { executeWithContext } from "@engine/core/context";
import { EngineEditor } from "@engine/core/engine-editor";
import { EngineSerializationManager } from "@engine/core/engine-serialization";
import { EngineUtils } from "@engine/core/engine-utils";
import { DeltaState } from "@engine/core/engine/delta";
import { InitState } from "@engine/core/engine/init";
import { Meta } from "@engine/core/engine/meta";
import { PhaseState } from "@engine/core/engine/phase";
import {
    resolveEngineRenderCullingSettings,
    type EngineRenderCullingSettings,
} from "@engine/core/engine/render-culling";
import { SystemsManager } from "@engine/core/engine/systems";
import type { AllSystems, ScenesTupleToRecord, StartEngineGenerator, StartEngineOpts } from "@engine/core/engine/types";
import type { EngineOverlay, EngineRenderCullingOptions } from "@engine/core/factory/types";
import { EngineInput } from "@engine/core/input";
import type { RenderPipeline } from "@engine/core/render-pipeline";
import { RenderManager } from "@engine/core/render-pipeline";
import { SceneManager } from "@engine/core/scene/scene-manager";
import type { SceneDefinitionTuple, SceneName } from "@engine/core/scene/scene.types";
import type { EngineInitializationSystem, EngineSystem, SystemFactoryTuple } from "@engine/core/system/types";
import type { UserWorld } from "@engine/ecs/world";

export class EngineClass<
	TSystems extends SystemFactoryTuple,
	TScenes extends SceneDefinitionTuple = [],
	TAssets extends Record<string, unknown> = Record<string, unknown>,
	TAssetTypes extends Record<string, unknown> = Record<string, unknown>,
> {
	#systemsManager: SystemsManager;
	#systemsView: Record<string, EngineSystem<any>>;
	#renderManager: RenderManager;

	#canvasManager: CanvasManager;
	#phase: PhaseState = new PhaseState();
	#init: InitState = new InitState();
	#delta: DeltaState = new DeltaState();
	#initialSceneName: SceneName<TScenes[number]> | null = null;
	#engineLoadingOverlay: EngineOverlay | null;

	public readonly scene: SceneManager<TScenes>;
	public readonly editor: EngineEditor;
	public readonly input: EngineInput;
	public readonly serialization: EngineSerializationManager;
	public readonly utils: EngineUtils;
	public readonly meta: Meta = new Meta(this.#phase.is);
	public readonly renderCulling: EngineRenderCullingSettings;

	public constructor(
		systems: Record<string, EngineSystem<any>>,
		scenes: SceneDefinitionTuple = [],
		public readonly assets: AssetManager<TAssets, TAssetTypes>,
		public readonly render: RenderPipeline | null,
		loadingOverlay: EngineOverlay | undefined,
		renderCulling: EngineRenderCullingOptions | undefined,
		serialization: { enableDirtyQueue?: boolean } | undefined,
		canvas: HTMLCanvasElement | null,
		awaitCanvasBeforeStart = false,
	) {
		this.#systemsManager = new SystemsManager(systems);
		this.scene = new SceneManager<TScenes>(scenes, this.#systemsManager).setEngineRef(this);
		this.#canvasManager = new CanvasManager(canvas, awaitCanvasBeforeStart);
		this.#renderManager = new RenderManager(this.render);
		this.utils = new EngineUtils(this);
		this.input = new EngineInput({
			resolveCanvas: () => this.canvas,
			getEngine: () => this,
		});
		this.serialization = new EngineSerializationManager(this, serialization);
		this.renderCulling = resolveEngineRenderCullingSettings(renderCulling);
		this.editor = new EngineEditor(this);
		this.#engineLoadingOverlay = loadingOverlay ?? null;

		this.#systemsView = this.#systemsManager.createSystemsView((name) => {
			return this.#systemsManager.getSceneSystem(this.scene.definition?.name ?? null, name);
		});
	}

	/** @internal */
	public getAllSceneSystems(): EngineSystem[] {
		return this.#systemsManager.getAllSceneSystems();
	}

	public get systems(): AllSystems<TSystems, TScenes> {
		return this.#systemsView as any;
	}

	public get scenes(): ScenesTupleToRecord<TScenes> {
		return this.scene.all as any;
	}

	public get world(): UserWorld {
		return this.scene.world;
	}

	public get canvas(): HTMLCanvasElement {
		return this.#canvasManager.getCanvas();
	}

	public setCanvas(canvas: HTMLCanvasElement): void {
		this.#canvasManager.setCanvas(canvas);
	}

	public removeCanvas(canvas: HTMLCanvasElement): void {
		this.#canvasManager.removeCanvas(canvas);
	}

	private async waitForCanvasReady(): Promise<void> {
		await this.#canvasManager.waitForCanvasReady();
	}

	public setInitializationSystem(system: EngineInitializationSystem): void {
		this.#init.setInitializationSystem(system);
	}

	public setInitialScene(name: SceneName<TScenes[number]>): void {
		this.#initialSceneName = name;
	}

	public async warmupLoadedTextures(): Promise<void> {
		await executeWithContext({ engine: this, scene: this.scene.context }, async () => {
			await this.#renderManager.warmupLoadedTextures();
		});
	}

	public async initialize(): Promise<void> {
		if (this.#init.initialized) return;

		if (this.#engineLoadingOverlay) {
			await this.#engineLoadingOverlay.begin();
		}

		try {
			await executeWithContext({ engine: this, scene: this.scene.context }, async () => {
				if (this.#init.initializationSystem) {
					await this.#init.initializationSystem.system();
				}

				await this.#systemsManager.initializeEngineSystems();

				await this.#renderManager.initialize();
				await this.#renderManager.warmupLoadedTextures();
			});
		} finally {
			if (this.#engineLoadingOverlay) {
				await this.#engineLoadingOverlay.end();
				await this.#engineLoadingOverlay.dispose();
			}
		}

		if (this.#initialSceneName && this.scene.activeSceneName === null) {
			await this.scene.set(this.#initialSceneName);
		}

		this.#init.markInitialized();
	}

	public async *startEngine(opts?: StartEngineOpts): StartEngineGenerator {
		await this.waitForCanvasReady();

		await this.initialize();

		this.meta.setTargetRates(opts?.fps || 60, opts?.ups || 60);

		const now = performance.now();
		this.#delta.initialize(now);

		const updateState = {
			delta: 0,
			shouldUpdate: false,
		};

		const frameState = {
			delta: 0,
			shouldUpdate: false,
		};

		const yieldState = [updateState, frameState] as const;

		const requestAnimationFrame = (cb: (time: number) => void) => {
			if (typeof window !== "undefined" && window.requestAnimationFrame) {
				return window.requestAnimationFrame(cb);
			}
			return setTimeout(() => cb(performance.now()), 1000 / this.meta.fps);
		};

		while (!opts?.signal?.aborted) {
			const now = await new Promise<number>(requestAnimationFrame);
			const snapshot = this.#delta.calculate(now, this.meta.fps, this.meta.ups);
			const updateTime = 1000 / this.meta.ups;

			if (snapshot.updateShouldRun || snapshot.frameShouldRun) {
				(updateState as any).delta = snapshot.updateDelta;
				(updateState as any).shouldUpdate = snapshot.updateShouldRun;
				(frameState as any).delta = snapshot.frameDelta;
				(frameState as any).shouldUpdate = snapshot.frameShouldRun;

				this.meta.setDeltas(snapshot.updateDelta, snapshot.frameDelta, updateTime);

				if (!this.scene.isTransitioning) {
					if (frameState.shouldUpdate) {
						this.runRenderPipeline(frameState.shouldUpdate);
					}
					if (updateState.shouldUpdate) {
						if (this.editor.runningState.paused) {
							this.#delta.markUpdated(now);
							this.meta.markUpdated(now);
							(updateState as any).shouldUpdate = false;
						} else {
							this.runUpdateSystems(updateState.shouldUpdate);
							this.#delta.markUpdated(now);
							this.meta.markUpdated(now);
							(updateState as any).shouldUpdate = false;
						}
					}
				}

				yield yieldState;

				if (snapshot.frameShouldRun) {
					this.#delta.markFramed(now);
				}
			}
		}
	}

	private runRenderPipeline(shouldUpdate: boolean): void {
		if (!shouldUpdate) return;
		if (!this.render) return;

		this.#phase.setCurrent("render");

		const activeSceneContext = this.scene.context;

		executeWithContext({ engine: this, scene: activeSceneContext }, () => {
			this.#renderManager.render();
		});

		this.#phase.clear();
	}

	private runUpdateSystems(shouldUpdate: boolean) {
		if (!shouldUpdate) return;

		this.#phase.setCurrent("update");
		const systemsToRun = this.#systemsManager.getEngineUpdateSystems();

		const activeSceneContext = this.scene.context;
		const sceneSystemsToRun = this.#systemsManager.getSceneUpdateSystems(
			this.scene.definition?.name ?? null,
		);

		executeWithContext({ engine: this, scene: activeSceneContext }, () => {
			for (const system of systemsToRun) {
				if (!system.enabled) continue;
				system.system();
			}

			for (const system of sceneSystemsToRun) {
				if (!system.enabled) continue;
				system.system();
			}
		});

		this.#phase.clear();
	}
}
