import type { LooseAssetManager } from "@assets/AssetManager";
import type { Color } from "@components/sprite";
import type { ShapeRenderInput, SpriteRenderData, TexturedQuadRenderData } from "@render/types/low-level";
import type { RendererAPI } from "@render/types/renderer-api";

export class RenderCommand {
  readonly #rendererApi: RendererAPI;

  constructor(rendererApi: RendererAPI) {
    this.#rendererApi = rendererApi;
  }

  initialize(canvas: HTMLCanvasElement, assets: LooseAssetManager): Promise<void> | void {
    return this.#rendererApi.initialize(canvas, assets);
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

  setMeshOverlayEnabled(enabled: boolean): void {
    this.#rendererApi.setMeshOverlayEnabled(enabled);
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

  drawTexturedQuad(data: TexturedQuadRenderData): void {
    this.#rendererApi.drawTexturedQuad(data);
  }

  drawShape(data: ShapeRenderInput): void {
    this.#rendererApi.drawShape(data);
  }

  getWidth(): number {
    return this.#rendererApi.getWidth();
  }

  getHeight(): number {
    return this.#rendererApi.getHeight();
  }
}
