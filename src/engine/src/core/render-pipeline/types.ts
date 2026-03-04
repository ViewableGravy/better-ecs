import type { UserWorld } from "@engine/ecs/world";

export type RenderPassScope = "frame" | "world";

export interface WorldProvider {
	getVisibleWorlds(): readonly UserWorld[];
}

export interface RenderPipeline {
	initialize(): Promise<void>;
	warmupLoadedTextures(): Promise<void>;
	render(): void;
}
