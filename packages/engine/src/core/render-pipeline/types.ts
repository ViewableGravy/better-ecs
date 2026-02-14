import type { UserWorld } from "../../ecs/world";

export type RenderPassScope = "frame" | "world";

export interface WorldProvider {
	getVisibleWorlds(): readonly UserWorld[];
}

export interface RenderPipeline {
	initialize(): void;
	render(): void;
}
