import type { EngineFrameAllocatorRegistry, FrameAllocatorRegistry } from "@engine/render";
import type { RenderPassContext } from "@engine/core/render-pipeline/context";

export type RenderPass<
	TRegistry extends FrameAllocatorRegistry = EngineFrameAllocatorRegistry,
	TState extends object = object,
> = {
	readonly name: string;
	execute: (context: RenderPassContext<TRegistry, TState>) => void;
};

/**
 * utility function for creating a render pass. This is the same as defining the type
 * explicitly but automatically infers the generic parameters from the provided object.
 */
export function createRenderPass(name: string) {
	function internalCreateRenderPass<
		TRegistry extends FrameAllocatorRegistry = EngineFrameAllocatorRegistry,
		TState extends object = object,
	>(renderPass: Omit<RenderPass<TRegistry, TState>, "name">): RenderPass<TRegistry, TState> {
		return {
			...renderPass,
			name: `render:${name}`,
		};
	}

	return internalCreateRenderPass;
}
