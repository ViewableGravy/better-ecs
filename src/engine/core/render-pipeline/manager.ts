import type { RenderPipeline } from "@engine/core/render-pipeline/types";

export class RenderManager {
  readonly #renderPipeline: RenderPipeline | null;

  constructor(renderPipeline: RenderPipeline | null) {
    this.#renderPipeline = renderPipeline;
  }

  async initialize(): Promise<void> {
    if (!this.#renderPipeline) {
      return;
    }

    await this.#renderPipeline.initialize();
  }

  render(): void {
    this.#renderPipeline?.render();
  }
}
