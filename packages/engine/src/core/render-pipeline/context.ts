import type { UserWorld } from "../../ecs/world";
import {
	type EngineFrameAllocatorRegistry,
	type FrameAllocatorRegistry,
	type InternalFrameAllocator,
} from "../../render/frame-allocator";
import { RenderQueue } from "../../render/render-queue";
import type { Renderer } from "../../render/renderer";
import type { WorldProvider } from "./types";

export class RenderPipelineContext<
	TRegistry extends FrameAllocatorRegistry = EngineFrameAllocatorRegistry,
	TState extends object = Record<string, never>,
> {
	readonly renderer: Renderer;
	readonly queue = new RenderQueue();
	readonly frameAllocator: InternalFrameAllocator<TRegistry>;
	readonly worldProvider: WorldProvider;
	readonly state: TState;

	visibleWorlds: readonly UserWorld[] = [];
	world: UserWorld;
	alpha = 1;

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
	}
}

export type RenderPassContext<
	TRegistry extends FrameAllocatorRegistry = EngineFrameAllocatorRegistry,
	TState extends object = Record<string, never>,
> = RenderPipelineContext<TRegistry, TState>;
