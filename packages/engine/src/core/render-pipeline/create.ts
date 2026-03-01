import type { LooseAssetManager } from "@assets/AssetManager";
import { Engine, fromContext } from "@context";
import { setContextRender } from "@core/context";
import { RenderPipelineContext } from "@core/render-pipeline/context";
import type { RenderPass } from "@core/render-pipeline/pass";
import { BeginFramePass } from "@core/render-pipeline/passes/begin-frame";
import { CameraControlPass } from "@core/render-pipeline/passes/camera-control";
import { EndFramePass } from "@core/render-pipeline/passes/end-frame";
import { RenderWorldPass } from "@core/render-pipeline/passes/render-world";
import type { RenderPipeline, WorldProvider } from "@core/render-pipeline/types";
import type { UserWorld } from "@ecs/world";
import type { Renderer } from "@render";
import {
	FrameAllocator,
	type EngineFrameAllocatorRegistry,
	type FrameAllocatorRegistry,
	type InternalFrameAllocator,
} from "@render";

type CorePassOverrides<
	TRegistry extends FrameAllocatorRegistry,
	TState extends object,
> = {
	beginFrame?: RenderPass<TRegistry, TState> | false;
	cameraControl?: RenderPass<TRegistry, TState> | false;
	renderWorld?: RenderPass<TRegistry, TState> | false;
	endFrame?: RenderPass<TRegistry, TState> | false;
};

export type CreateRenderPipelineContext<TState extends object = Record<string, never>> = {
	renderer: Renderer;
	worldProvider?: WorldProvider;
	frameAllocator?: InternalFrameAllocator<FrameAllocatorRegistry>;
	state?: TState;
};

type InitializeRenderContextOptions = {
	canvas: HTMLCanvasElement;
	assets: LooseAssetManager;
};

type CreateRenderPipelineOptions<
	TRegistry extends FrameAllocatorRegistry,
	TState extends object = Record<string, never>,
> = {
	initializeContext: (
		options: InitializeRenderContextOptions,
	) => Promise<CreateRenderPipelineContext<TState>> | CreateRenderPipelineContext<TState>;
	passes?: readonly RenderPass<TRegistry, TState>[];
	beforeWorldPasses?: readonly RenderPass<TRegistry, TState>[];
	afterWorldPasses?: readonly RenderPass<TRegistry, TState>[];
	overrides?: CorePassOverrides<TRegistry, TState>;
};

class DefaultWorldProvider implements WorldProvider {
	getVisibleWorlds(): readonly UserWorld[] {
		return [fromContext(Engine).world];
	}
}

export function createRenderPipeline<
	TRegistry extends FrameAllocatorRegistry = EngineFrameAllocatorRegistry,
	TState extends object = Record<string, never>,
>(options: CreateRenderPipelineOptions<TRegistry, TState>): RenderPipeline {
	let context: RenderPipelineContext<TRegistry, TState> | null = null;
	let contextPromise: Promise<RenderPipelineContext<TRegistry, TState>> | null = null;

	const getOrInitializeContext = async (): Promise<RenderPipelineContext<TRegistry, TState>> => {
		if (context) {
			return context;
		}

		if (contextPromise) {
			return contextPromise;
		}

		const engine = fromContext(Engine);

		contextPromise = Promise.resolve(
			options.initializeContext({
				canvas: engine.canvas,
				assets: engine.assets,
			}),
		).then((initialized) => {
			const frameAllocator =
				(initialized.frameAllocator as InternalFrameAllocator<TRegistry> | undefined) ??
				// The default path creates an engine allocator with built-in pools.
				// This cast is isolated to the initialization boundary when user code omits a custom allocator.
				(new FrameAllocator() as unknown as InternalFrameAllocator<TRegistry>);
			const worldProvider = initialized.worldProvider ?? new DefaultWorldProvider();

			context = new RenderPipelineContext({
				renderer: initialized.renderer,
				frameAllocator,
				worldProvider,
				// `state` defaults to an empty object and is optionally extended by user code.
				// This cast is localized to the initialization boundary.
				state: (initialized.state ?? {}) as TState,
				world: fromContext(Engine).world,
			});

			return context;
		});

		return contextPromise;
	};

	const requireContext = (): RenderPipelineContext<TRegistry, TState> => {
		if (!context) {
			throw new Error("Render pipeline context is not initialized. Ensure initialize() is awaited before render().");
		}

		return context;
	};

	const getScope = (pass: RenderPass<TRegistry, TState>): "frame" | "world" => {
		return pass.scope ?? "frame";
	};

	const resolveCorePass = (
		override: RenderPass<TRegistry, TState> | false | undefined,
		fallback: RenderPass,
	): RenderPass<TRegistry, TState> | undefined => {
		if (override === false) {
			return undefined;
		}

		return (override ?? fallback) as RenderPass<TRegistry, TState>;
	};

	const beginFramePass = resolveCorePass(options.overrides?.beginFrame, BeginFramePass);
	const cameraControlPass = resolveCorePass(options.overrides?.cameraControl, CameraControlPass);
	const renderWorldPass = resolveCorePass(options.overrides?.renderWorld, RenderWorldPass);
	const endFramePass = resolveCorePass(options.overrides?.endFrame, EndFramePass);
	const useUnifiedPassList = options.passes !== undefined;
	const unifiedPasses = options.passes ?? [];

	const resolvedPasses: RenderPass<TRegistry, TState>[] = useUnifiedPassList
		? [
			...(beginFramePass ? [beginFramePass] : []),
			...(cameraControlPass ? [cameraControlPass] : []),
			...unifiedPasses,
			...(renderWorldPass ? [renderWorldPass] : []),
			...(options.afterWorldPasses ?? []),
			...(endFramePass ? [endFramePass] : []),
		]
		: [
			...(beginFramePass ? [beginFramePass] : []),
			...(cameraControlPass ? [cameraControlPass] : []),
			...(options.beforeWorldPasses ?? []),
			...(renderWorldPass ? [renderWorldPass] : []),
			...(options.afterWorldPasses ?? []),
			...(endFramePass ? [endFramePass] : []),
		];

	return {
		async initialize(): Promise<void> {
			await getOrInitializeContext();
		},
		render(): void {
			const passContext = requireContext();
			const engine = fromContext(Engine);

			// 1) Build interpolation alpha from the latest fixed-step update timing.
			const updateTimeMs = 1000 / engine.meta.ups;
			const timeSinceLastUpdate = performance.now() - engine.meta.lastUpdateTime;
			passContext.interpolationAlpha = Math.min(timeSinceLastUpdate / updateTimeMs, 1);

			// 2) Resolve worlds that should be rendered this frame.
			passContext.visibleWorlds = passContext.worldProvider.getVisibleWorlds();

			// 3) Reset per-frame pipeline state and allocator pools.
			passContext.queue.clear();
			passContext.frameAllocator.beginFrame();
			const previousRenderContext = setContextRender(passContext);

			try {
				// 4) Execute passes with world-pass block interleaving:
				//    - Frame passes run once
				//    - Consecutive world passes run together per world
				for (let index = 0; index < resolvedPasses.length;) {
					const pass = resolvedPasses[index];

					if (getScope(pass) === "frame") {
						pass.execute(passContext);
						index += 1;
						continue;
					}

					let blockEnd = index;
					while (blockEnd < resolvedPasses.length && getScope(resolvedPasses[blockEnd]) === "world") {
						blockEnd += 1;
					}

					for (const world of passContext.visibleWorlds) {
						passContext.world = world;
						for (let worldPassIndex = index; worldPassIndex < blockEnd; worldPassIndex += 1) {
							resolvedPasses[worldPassIndex].execute(passContext);
						}
					}

					index = blockEnd;
				}
			} finally {
				setContextRender(previousRenderContext);
				passContext.world = engine.world;
				passContext.frameAllocator.endFrame();
			}
		},
	};
}
