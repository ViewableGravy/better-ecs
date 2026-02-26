import type { UserWorld } from "../../ecs/world";
import { FrameAllocator, type FrameAllocatorRegistry } from "../../render/frame-allocator";
import type { Renderer } from "../../render/renderer";
import { fromContext, Engine } from "../../context";
import { RenderPipelineContext, type RenderPassContext } from "./context";
import type { RenderPass } from "./pass";
import type { RenderPipeline, WorldProvider } from "./types";

type CreateRenderPipelineContext<
	TRegistry extends FrameAllocatorRegistry,
	TState extends object,
> = {
	renderer: Renderer;
	worldProvider?: WorldProvider;
	frameAllocator?: FrameAllocator<TRegistry>;
	state?: TState;
};

type CreateRenderPipelineOptions<
	TRegistry extends FrameAllocatorRegistry,
	TState extends object,
> = {
	initializeContext: () => CreateRenderPipelineContext<TRegistry, TState>;
	passes: readonly RenderPass<TRegistry, TState>[];
};

class DefaultWorldProvider implements WorldProvider {
	getVisibleWorlds(): readonly UserWorld[] {
		return [fromContext(Engine).world];
	}
}

export function createRenderPipeline<
	TRegistry extends FrameAllocatorRegistry = Record<string, never>,
	TState extends object = Record<string, never>,
>(options: CreateRenderPipelineOptions<TRegistry, TState>): RenderPipeline {
	let context: RenderPipelineContext<TRegistry, TState> | null = null;

	const getOrInitializeContext = (): RenderPipelineContext<TRegistry, TState> => {
		if (context) {
			return context;
		}

		const initialized = options.initializeContext();
		const frameAllocator =
			initialized.frameAllocator ??
			// `FrameAllocator` needs the concrete `TRegistry` shape, but the default path
			// intentionally starts with an empty registry and lets user code grow it.
			// This cast is isolated to the initialization boundary.
			new FrameAllocator({} as TRegistry);
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

	const runPass = (
		pass: RenderPass<TRegistry, TState>,
		passContext: RenderPassContext<TRegistry, TState>,
	): void => {
		if ((pass.scope ?? "frame") === "frame") {
			pass.execute(passContext);
			return;
		}

		for (const world of passContext.visibleWorlds) {
			passContext.world = world;
			pass.execute(passContext);
		}
	};

	return {
		initialize(): void {
			getOrInitializeContext();
		},
		render(): void {
			const passContext = getOrInitializeContext();
			const engine = fromContext(Engine);

			const updateTimeMs = 1000 / engine.meta.ups;
			const timeSinceLastUpdate = performance.now() - engine.meta.lastUpdateTime;
			passContext.alpha = Math.min(timeSinceLastUpdate / updateTimeMs, 1);
			passContext.visibleWorlds = passContext.worldProvider.getVisibleWorlds();

			passContext.queue.clear();
			passContext.frameAllocator.beginFrame();

			try {
				for (const pass of options.passes) {
					runPass(pass, passContext);
				}
			} finally {
				passContext.world = fromContext(Engine).world;
				passContext.frameAllocator.endFrame();
			}
		},
	};
}
