import type { LooseAssetManager } from "@engine/asset/AssetManager";
import type { Rgba } from "@engine/components/sprite/sprite";
import type { TextureSourceData } from "@engine/components/texture";
import type { ShapeRenderInput, SpriteRenderData, TexturedQuadRenderData } from "@engine/render/types/low-level";
import type { RetainedSpriteRenderData } from "@engine/render/retained/retained-sprite-store";

export interface RendererAPI {
  initialize(canvas: HTMLCanvasElement, assets: LooseAssetManager): Promise<void> | void;
  preloadTextures(sources: readonly TextureSourceData[]): void;

  beginFrame(): void;
  endFrame(): void;
  clear(color: Rgba): void;

  setCamera(x: number, y: number, zoom: number): void;
  setMeshOverlayEnabled(enabled: boolean): void;
  getCameraX(): number;
  getCameraY(): number;
  getCameraZoom(): number;

  drawSprite(data: SpriteRenderData): void;
  upsertRetainedSprite(bucketId: number, instanceId: number, data: RetainedSpriteRenderData): void;
  removeRetainedSprite(bucketId: number, instanceId: number): void;
  drawRetainedSpriteBucket(bucketId: number, interpolationAlpha: number): void;
  releaseRetainedSpriteBucket(bucketId: number): void;
  drawTexturedQuad(data: TexturedQuadRenderData): void;
  drawShape(data: ShapeRenderInput): void;

  getWidth(): number;
  getHeight(): number;
}
