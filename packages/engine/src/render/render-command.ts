import type { Color } from "../components/sprite";
import type { ShapeRenderData, SpriteRenderData } from "./types/low-level";
import type { RendererAPI } from "./types/renderer-api";

export class RenderCommand {
  readonly #rendererApi: RendererAPI;

  constructor(rendererApi: RendererAPI) {
    this.#rendererApi = rendererApi;
  }

  initialize(canvas: HTMLCanvasElement): void {
    this.#rendererApi.initialize(canvas);
  }

  beginFrame(): void {
    this.#rendererApi.beginFrame();
  }

  endFrame(): void {
    this.#rendererApi.endFrame();
  }

  clear(color: Color): void {
    this.#rendererApi.clear(color);
  }

  setCamera(x: number, y: number, zoom: number): void {
    this.#rendererApi.setCamera(x, y, zoom);
  }

  getCameraX(): number {
    return this.#rendererApi.getCameraX();
  }

  getCameraY(): number {
    return this.#rendererApi.getCameraY();
  }

  getCameraZoom(): number {
    return this.#rendererApi.getCameraZoom();
  }

  drawSprite(data: SpriteRenderData): void {
    this.#rendererApi.drawSprite(data);
  }

  drawShape(data: ShapeRenderData): void {
    this.#rendererApi.drawShape(data);
  }

  getWidth(): number {
    return this.#rendererApi.getWidth();
  }

  getHeight(): number {
    return this.#rendererApi.getHeight();
  }
}
