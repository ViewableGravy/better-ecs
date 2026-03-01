import { AssetManager } from "@assets/AssetManager";
import { CanvasManager } from "@core/canvas";
import { executeWithContext } from "@core/context";
import { EngineEditor } from "@core/engine-editor";
import { EngineUtils } from "@core/engine-utils";
import { DeltaState } from "@core/engine/delta";
import { InitState } from "@core/engine/init";
import { Meta } from "@core/engine/meta";
import { PhaseState } from "@core/engine/phase";
import {
    resolveEngineRenderCullingSettings,
    type EngineRenderCullingSettings,
} from "@core/engine/render-culling";
import { SystemsManager } from "@core/engine/systems";
import type { AllSystems, ScenesTupleToRecord, StartEngineGenerator, StartEngineOpts } from "@core/engine/types";
import type { EngineRenderCullingOptions } from "@core/factory/types";
import { EngineInput } from "@core/input";
import type { RenderPipeline } from "@core/render-pipeline";
import { RenderManager } from "@core/render-pipeline";
import { SceneManager } from "@core/scene/scene-manager";
import type { SceneDefinitionTuple } from "@core/scene/scene.types";
import type { EngineInitializationSystem, EngineSystem, SystemFactoryTuple } from "@core/system/types";
import type { UserWorld } from "@ecs/world";

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

	public readonly scene: SceneManager<TScenes>;
	public readonly editor: EngineEditor;
	public readonly input: EngineInput;
	public readonly utils: EngineUtils;
	public readonly meta: Meta = new Meta(this.#phase.is);
	public readonly renderCulling: EngineRenderCullingSettings;

	public constructor(
		systems: Record<string, EngineSystem<any>>,
		scenes: SceneDefinitionTuple = [],
		public readonly assets: AssetManager<TAssets, TAssetTypes>,
		public readonly render: RenderPipeline | null,
		renderCulling: EngineRenderCullingOptions | undefined,
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
		this.renderCulling = resolveEngineRenderCullingSettings(renderCulling);
		this.editor = new EngineEditor(this);

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

	public async initialize(): Promise<void> {
		if (this.#init.initialized) return;

		await executeWithContext({ engine: this, scene: this.scene.context }, async () => {
			if (this.#init.initializationSystem) {
				await this.#init.initializationSystem.system();
			}

			this.#systemsManager.initializeEngineSystems();

			await this.#renderManager.initialize();
		});

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
					if (updateState.shouldUpdate && !this.editor.runningState.paused) {
						this.runUpdateSystems(updateState.shouldUpdate);
						this.#delta.markUpdated(now);
						this.meta.markUpdated(now);
						(updateState as any).shouldUpdate = false;
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
