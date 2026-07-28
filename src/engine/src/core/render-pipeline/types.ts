export interface RenderPipeline {
	initialize(): Promise<void>;
	warmupLoadedTextures(): Promise<void>;
	render(): void;
}
