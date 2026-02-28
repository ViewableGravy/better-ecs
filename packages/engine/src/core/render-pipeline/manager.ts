import type { RenderPipeline } from "./types";

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
