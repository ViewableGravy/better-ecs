import type { RenderPipeline } from "@engine/core/render-pipeline/types";

export class RenderManager {
  readonly #renderPipeline: RenderPipeline | null;
  #initialized = false;

  constructor(renderPipeline: RenderPipeline | null) {
    this.#renderPipeline = renderPipeline;
  }

  async initialize(): Promise<void> {
    if (!this.#renderPipeline) {
      return;
    }

    await this.#renderPipeline.initialize();
    this.#initialized = true;
  }

  async warmupLoadedTextures(): Promise<void> {
    if (!this.#renderPipeline) {
      return;
    }

    if (!this.#initialized) {
      return;
    }

    await this.#renderPipeline.warmupLoadedTextures();
  }

  render(): void {
    this.#renderPipeline?.render();
  }
}
