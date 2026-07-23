import type { LooseAssetManager } from "@engine/asset/AssetManager";
import type { Rgba } from "@engine/components/sprite/sprite";
import type { TextureSourceData } from "@engine/components/texture";
import type { ShapeRenderInput, SpriteRenderData, TexturedQuadRenderData } from "@engine/render/types/low-level";
import type { RetainedSpriteRenderData } from "@engine/render/retained/retained-sprite-store";
import type { RendererAPI } from "@engine/render/types/renderer-api";

export class RenderCommand {
  readonly #rendererApi: RendererAPI;

  constructor(rendererApi: RendererAPI) {
    this.#rendererApi = rendererApi;
  }

  initialize(canvas: HTMLCanvasElement, assets: LooseAssetManager): Promise<void> | void {
    return this.#rendererApi.initialize(canvas, assets);
  }

  preloadTextures(sources: readonly TextureSourceData[]): void {
    this.#rendererApi.preloadTextures(sources);
  }

  beginFrame(): void {
    this.#rendererApi.beginFrame();
  }

  endFrame(): void {
    this.#rendererApi.endFrame();
  }

  clear(color: Rgba): void {
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

  upsertRetainedSprite(bucketId: number, instanceId: number, data: RetainedSpriteRenderData): void {
    this.#rendererApi.upsertRetainedSprite(bucketId, instanceId, data);
  }

  removeRetainedSprite(bucketId: number, instanceId: number): void {
    this.#rendererApi.removeRetainedSprite(bucketId, instanceId);
  }

  drawRetainedSpriteBucket(bucketId: number, interpolationAlpha: number): void {
    this.#rendererApi.drawRetainedSpriteBucket(bucketId, interpolationAlpha);
  }

  releaseRetainedSpriteBucket(bucketId: number): void {
    this.#rendererApi.releaseRetainedSpriteBucket(bucketId);
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
