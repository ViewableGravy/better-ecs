import { AssetManager } from "../../asset/AssetManager";
import type { UserWorld } from "../../ecs/world";
import { CanvasManager } from "../canvas";
import { executeWithContext } from "../context";
import type { RenderPipeline } from "../render-pipeline";
import { createEngineRunningState, type EngineRunningState } from "../running-state";
import { SceneManager } from "../scene/scene-manager";
import type { SceneDefinitionTuple } from "../scene/scene.types";
import { executeSystemInitialize } from "../system";
import type { EngineInitializationSystem, EngineSystem, SystemFactoryTuple } from "../system/types";
import { DeltaState } from "./delta";
import { InitState } from "./init";
import { Meta } from "./meta";
import { PhaseState } from "./phase";
import type { AllSystems, ScenesTupleToRecord, StartEngineGenerator, StartEngineOpts } from "./types";

export class EngineClass<
	TSystems extends SystemFactoryTuple,
	TScenes extends SceneDefinitionTuple = [],
	TAssets extends Record<string, unknown> = Record<string, unknown>,
> {
	#systems: Record<string, EngineSystem<any>>;
	#systemsView: Record<string, EngineSystem<any>>;
	#updateSystems: EngineSystem<any>[] = [];

	#canvasManager: CanvasManager;
	#renderPipeline: RenderPipeline | null;
	#phase: PhaseState = new PhaseState();
	#init: InitState = new InitState();
	#delta: DeltaState = new DeltaState();

	public readonly scene: SceneManager<TScenes>;
	public readonly runningState: EngineRunningState = createEngineRunningState();
	public readonly meta: Meta = new Meta(this.#phase.is);

	public constructor(
		systems: Record<string, EngineSystem<any>>,
		scenes: SceneDefinitionTuple = [],
		public readonly assets: AssetManager<TAssets>,
		renderPipeline: RenderPipeline | null,
		canvas: HTMLCanvasElement | null,
		awaitCanvasBeforeStart = false,
	) {
		this.#systems = systems;
		this.#renderPipeline = renderPipeline;

		this.scene = new SceneManager<TScenes>(scenes).setEngineRef(this);
		this.#canvasManager = new CanvasManager(canvas, awaitCanvasBeforeStart);

		this.#systemsView = new Proxy(this.#systems, {
			get: (target, prop) => {
				if (typeof prop !== "string") return (target as any)[prop];
				if (prop in target) return (target as any)[prop];
				return this.scene.getActiveSystem(prop);
			},
			has: (target, prop) => {
				if (typeof prop !== "string") return prop in target;
				return prop in target || this.scene.getActiveSystem(prop) !== undefined;
			},
		});

		this.precomputeSystemOrder();
	}

	private precomputeSystemOrder() {
		const allSystems = Object.values(this.#systems);

		this.#updateSystems = allSystems.sort((a, b) => b.priority - a.priority);
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

			for (const system of Object.values(this.#systems)) {
				executeSystemInitialize(system);
			}

			this.#renderPipeline?.initialize();
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
					if (updateState.shouldUpdate && !this.runningState.paused) {
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
		if (!this.#renderPipeline) return;

		this.#phase.setCurrent("render");

		const activeSceneContext = this.scene.context;

		executeWithContext({ engine: this, scene: activeSceneContext }, () => {
			this.#renderPipeline?.render();
		});

		this.#phase.clear();
	}

	private runUpdateSystems(shouldUpdate: boolean) {
		if (!shouldUpdate) return;

		this.#phase.setCurrent("update");
		const systemsToRun = this.#updateSystems;

		const activeSceneContext = this.scene.context;
		const sceneSystemsToRun = this.scene.getUpdateSystems();

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
