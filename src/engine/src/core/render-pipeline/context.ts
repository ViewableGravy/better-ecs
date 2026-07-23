import type { WorldProvider } from "@engine/core/render-pipeline/types";
import type { UserWorld } from "@engine/ecs/world";
import type { Renderer } from "@engine/render";
import { SpritePipe } from "@engine/core/render-pipeline/passes/render-world/retained-sprites/sprite-pipe";
import {
    RenderQueue,
    type EngineFrameAllocatorRegistry,
    type FrameAllocatorRegistry,
    type InternalFrameAllocator,
} from "@engine/render";

export class RenderPipelineContext<
	TRegistry extends FrameAllocatorRegistry = EngineFrameAllocatorRegistry,
	TState extends object = Record<string, never>,
> {
	readonly renderer: Renderer;
	readonly queue = new RenderQueue();
	readonly frameAllocator: InternalFrameAllocator<TRegistry>;
	readonly worldProvider: WorldProvider;
	readonly state: TState;
	readonly spritePipe: SpritePipe;

	visibleWorlds: readonly UserWorld[] = [];
	world: UserWorld;
	interpolationAlpha = 1;

	constructor(options: {
		renderer: Renderer;
		worldProvider: WorldProvider;
		frameAllocator: InternalFrameAllocator<TRegistry>;
		state: TState;
		world: UserWorld;
	}) {
		this.renderer = options.renderer;
		this.worldProvider = options.worldProvider;
		this.frameAllocator = options.frameAllocator;
		this.state = options.state;
		this.world = options.world;
		this.spritePipe = new SpritePipe(options.renderer);
	}
}

export type RenderPassContext<
	TRegistry extends FrameAllocatorRegistry = EngineFrameAllocatorRegistry,
	TState extends object = Record<string, never>,
> = RenderPipelineContext<TRegistry, TState>;

export type AnyRenderPipelineContext = RenderPipelineContext<
	FrameAllocatorRegistry,
	Record<string, unknown>
>;
