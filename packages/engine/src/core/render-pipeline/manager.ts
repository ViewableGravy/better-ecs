import type { RenderPipeline } from "./types";

export class RenderManager {
  readonly #renderPipeline: RenderPipeline | null;

  constructor(renderPipeline: RenderPipeline | null) {
    this.#renderPipeline = renderPipeline;
  }

  initialize(): void {
    this.#renderPipeline?.initialize();
  }

  render(): void {
    this.#renderPipeline?.render();
  }
}
