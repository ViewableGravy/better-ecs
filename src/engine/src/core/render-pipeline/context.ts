import type { Registry } from "@engine/ecs/registry";
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
	readonly state: TState;
	readonly spritePipe: SpritePipe;

	registry: Registry;
	interpolationAlpha = 1;

	constructor(options: {
		renderer: Renderer;
		frameAllocator: InternalFrameAllocator<TRegistry>;
		state: TState;
		registry: Registry;
	}) {
		this.renderer = options.renderer;
		this.frameAllocator = options.frameAllocator;
		this.state = options.state;
		this.registry = options.registry;
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
