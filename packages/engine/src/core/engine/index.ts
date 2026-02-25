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
import type { FrameStats } from "../types";
import type { AllSystems, ScenesTupleToRecord, StartEngineGenerator, StartEngineOpts } from "./types";

export class EngineClass<
	TSystems extends SystemFactoryTuple,
	TScenes extends SceneDefinitionTuple = [],
	TAssets extends Record<string, unknown> = Record<string, unknown>,
> {
	#systems: Record<string, EngineSystem<any>>;
	#systemsView: Record<string, EngineSystem<any>>;
	#canvasManager: CanvasManager;

	#updateSystems: EngineSystem<any>[] = [];
	#renderPipeline: RenderPipeline | null;

	#currentPhase: "update" | "render" | null = null;
	#phaseFn = (phase: "update" | "render") => phase === this.#currentPhase;

	private initializationSystem: EngineInitializationSystem | null = null;
	private initialized = false;

	public readonly scene: SceneManager<TScenes>;
	public readonly assets: AssetManager<TAssets>;
	public readonly render: RenderPipeline | null;
	public readonly runningState: EngineRunningState = createEngineRunningState();

	public frame: FrameStats = {
		updateDelta: 0,
		frameDelta: 0,
		phase: () => false,
		fps: 60,
		ups: 60,
		initialFPS: 60,
		initialUPS: 60,
		updateProgress: 0,
		lastUpdateTime: 0,
	};

	public constructor(
		systems: Record<string, EngineSystem<any>>,
		scenes: SceneDefinitionTuple = [],
		assets: AssetManager<TAssets>,
		renderPipeline: RenderPipeline | null,
		canvas: HTMLCanvasElement | null,
		awaitCanvasBeforeStart = false,
	) {
		this.#systems = systems;
		this.scene = new SceneManager<TScenes>(scenes);
		this.scene.setEngineRef(this);
		this.assets = assets;
		this.#renderPipeline = renderPipeline;
		this.#canvasManager = new CanvasManager(canvas, awaitCanvasBeforeStart);
		this.render = renderPipeline;

		this.frame.phase = this.#phaseFn;

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

	public async initialize(): Promise<void> {
		if (this.initialized) return;

		await executeWithContext({ engine: this, scene: this.scene.context }, async () => {
			if (this.initializationSystem) {
				await this.initializationSystem.system();
			}

			for (const system of Object.values(this.#systems)) {
				executeSystemInitialize(system);
			}

			this.#renderPipeline?.initialize();
		});

		this.initialized = true;
	}

	public async *startEngine(opts?: StartEngineOpts): StartEngineGenerator {
		await this.waitForCanvasReady();

		await this.initialize();

		this.frame.fps = opts?.fps || 60;
		this.frame.ups = opts?.ups || 60;
		this.frame.initialFPS = opts?.fps || 60;
		this.frame.initialUPS = opts?.ups || 60;

		let lastUpdateTime = performance.now();
		let lastFrameTime = performance.now();

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
			return setTimeout(() => cb(performance.now()), 1000 / this.frame.fps);
		};

		while (!opts?.signal?.aborted) {
			const frameTime = 1000 / this.frame.fps;
			const updateTime = 1000 / this.frame.ups;

			const now = await new Promise<number>(requestAnimationFrame);

			const updateDelta = now - lastUpdateTime;
			const frameDelta = now - lastFrameTime;

			const frameTolerance = frameTime * 0.15;
			const updateTolerance = updateTime * 0.15;

			const updateShouldRun = updateDelta >= updateTime - updateTolerance;
			const frameShouldRun = frameDelta >= frameTime - frameTolerance;

			if (updateShouldRun || frameShouldRun) {
				(updateState as any).delta = updateDelta;
				(updateState as any).shouldUpdate = updateShouldRun;
				(frameState as any).delta = frameDelta;
				(frameState as any).shouldUpdate = frameShouldRun;

				this.frame.updateDelta = updateDelta;
				this.frame.frameDelta = frameDelta;
				this.frame.updateProgress = Math.min(updateDelta / updateTime, 1.0);

				if (!this.scene.isTransitioning) {
					if (frameState.shouldUpdate) {
						this.runRenderPipeline(frameState.shouldUpdate);
					}
					if (updateState.shouldUpdate && !this.runningState.paused) {
						this.runUpdateSystems(updateState.shouldUpdate);
						lastUpdateTime = now;
						this.frame.lastUpdateTime = now;
						(updateState as any).shouldUpdate = false;
					}
				}

				yield yieldState;

				if (frameShouldRun) {
					lastFrameTime = now;
				}
			}
		}
	}

	private runRenderPipeline(shouldUpdate: boolean): void {
		if (!shouldUpdate) return;
		if (!this.#renderPipeline) return;

		this.#currentPhase = "render";

		const activeSceneContext = this.scene.context;

		executeWithContext({ engine: this, scene: activeSceneContext }, () => {
			this.#renderPipeline?.render();
		});

		this.#currentPhase = null;
	}

	private runUpdateSystems(shouldUpdate: boolean) {
		if (!shouldUpdate) return;

		this.#currentPhase = "update";
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

		this.#currentPhase = null;
	}
}
