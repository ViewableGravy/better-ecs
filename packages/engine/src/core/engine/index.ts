import { AssetManager } from "../../asset/AssetManager";
import { Camera, Transform2D } from "../../components";
import type { EntityId } from "../../ecs/entity";
import type { UserWorld } from "../../ecs/world";
import { CanvasManager } from "../canvas";
import { executeWithContext } from "../context";
import { EngineEditor } from "../engine-editor";
import type { RenderPipeline } from "../render-pipeline";
import { RenderManager } from "../render-pipeline";
import { SceneManager } from "../scene/scene-manager";
import type { SceneDefinitionTuple } from "../scene/scene.types";
import type { EngineInitializationSystem, EngineSystem, SystemFactoryTuple } from "../system/types";
import { DeltaState } from "./delta";
import { InitState } from "./init";
import { Meta } from "./meta";
import { PhaseState } from "./phase";
import { SystemsManager } from "./systems";
import type { AllSystems, ScenesTupleToRecord, StartEngineGenerator, StartEngineOpts } from "./types";

export class EngineClass<
	TSystems extends SystemFactoryTuple,
	TScenes extends SceneDefinitionTuple = [],
	TAssets extends Record<string, unknown> = Record<string, unknown>,
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
	public readonly meta: Meta = new Meta(this.#phase.is);

	public constructor(
		systems: Record<string, EngineSystem<any>>,
		scenes: SceneDefinitionTuple = [],
		public readonly assets: AssetManager<TAssets>,
		public readonly render: RenderPipeline | null,
		canvas: HTMLCanvasElement | null,
		awaitCanvasBeforeStart = false,
	) {
		this.#systemsManager = new SystemsManager(systems);
		this.scene = new SceneManager<TScenes>(scenes, this.#systemsManager).setEngineRef(this);
		this.#canvasManager = new CanvasManager(canvas, awaitCanvasBeforeStart);
		this.#renderManager = new RenderManager(this.render);
		this.editor = new EngineEditor({
			onPause: () => {
				this.syncEditorCameraFromWorld();
			},
		});

		this.#systemsView = this.#systemsManager.createSystemsView((name) => {
			return this.#systemsManager.getSceneSystem(this.scene.definition?.name ?? null, name);
		});
	}

	private syncEditorCameraFromWorld(): void {
		if (this.editor.camera.mode !== "engine") {
			return;
		}

		const world = this.scene.world;
		let fallbackCameraEntityId: EntityId | null = null;

		for (const cameraEntityId of world.query(Camera, Transform2D)) {
			const camera = world.get(cameraEntityId, Camera);
			const transform = world.get(cameraEntityId, Transform2D);

			if (!camera || !camera.enabled || !transform) {
				continue;
			}

			if (!camera.primary && fallbackCameraEntityId === null) {
				fallbackCameraEntityId = cameraEntityId;
				continue;
			}

			if (!camera.primary) {
				continue;
			}

			const viewportHeight = this.canvas.getBoundingClientRect().height;
			const zoom = camera.orthoSize > 0 ? viewportHeight / (camera.orthoSize * 2) : 1;
			this.editor.camera.setView(transform.curr.pos.x, transform.curr.pos.y, zoom);
			return;
		}

		if (fallbackCameraEntityId !== null) {
			const fallbackCamera = world.get(fallbackCameraEntityId, Camera);
			const fallbackTransform = world.get(fallbackCameraEntityId, Transform2D);

			if (fallbackCamera && fallbackTransform) {
				const viewportHeight = this.canvas.getBoundingClientRect().height;
				const zoom = fallbackCamera.orthoSize > 0 ? viewportHeight / (fallbackCamera.orthoSize * 2) : 1;
				this.editor.camera.setView(fallbackTransform.curr.pos.x, fallbackTransform.curr.pos.y, zoom);
				return;
			}

		}

		this.editor.camera.setView(0, 0, 1);
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

			this.#renderManager.initialize();
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
