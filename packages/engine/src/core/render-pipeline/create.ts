import { Engine, fromContext } from "../../context";
import type { UserWorld } from "../../ecs/world";
import {
    FrameAllocator,
    type EngineFrameAllocatorRegistry,
    type FrameAllocatorRegistry,
    type InternalFrameAllocator,
} from "../../render";
import type { Renderer } from "../../render";
import { RenderPipelineContext } from "./context";
import type { RenderPass } from "./pass";
import { BeginFramePass } from "./passes/begin-frame";
import { CameraControlPass } from "./passes/camera-control";
import { EndFramePass } from "./passes/end-frame";
import { RenderWorldPass } from "./passes/render-world";
import type { RenderPipeline, WorldProvider } from "./types";

type CorePassOverrides<
	TRegistry extends FrameAllocatorRegistry,
	TState extends object,
> = {
	beginFrame?: RenderPass<TRegistry, TState> | false;
	cameraControl?: RenderPass<TRegistry, TState> | false;
	renderWorld?: RenderPass<TRegistry, TState> | false;
	endFrame?: RenderPass<TRegistry, TState> | false;
};

type CreateRenderPipelineContext<TState extends object> = {
	renderer: Renderer;
	worldProvider?: WorldProvider;
	frameAllocator?: InternalFrameAllocator<FrameAllocatorRegistry>;
	state?: TState;
};

type CreateRenderPipelineOptions<
	TRegistry extends FrameAllocatorRegistry,
	TState extends object,
> = {
	initializeContext: () => CreateRenderPipelineContext<TState>;
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

	const getOrInitializeContext = (): RenderPipelineContext<TRegistry, TState> => {
		if (context) {
			return context;
		}

		const initialized = options.initializeContext();
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
		initialize(): void {
			getOrInitializeContext();
		},
		render(): void {
			const passContext = getOrInitializeContext();
			const engine = fromContext(Engine);

			// 1) Build interpolation alpha from the latest fixed-step update timing.
			const updateTimeMs = 1000 / engine.meta.ups;
			const timeSinceLastUpdate = performance.now() - engine.meta.lastUpdateTime;
			passContext.alpha = Math.min(timeSinceLastUpdate / updateTimeMs, 1);

			// 2) Resolve worlds that should be rendered this frame.
			passContext.visibleWorlds = passContext.worldProvider.getVisibleWorlds();

			// 3) Reset per-frame pipeline state and allocator pools.
			passContext.queue.clear();
			passContext.frameAllocator.beginFrame();

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
				passContext.world = fromContext(Engine).world;
				passContext.frameAllocator.endFrame();
			}
		},
	};
}
